/**
 * Lista dei parametri
 * 
 * fieldId
 * classesPrefix
 * addedClasses
 * fieldPlaceholder
 * typingMode
 * dataModels{name:model}
 * disableStatusIcon
 * statusIcons:[normal,loading,opened_ognuna{content,classes,cursor}]
 * activeDataSource
 * ifSuperChainerEmptyThenShow
 * dataSources
 *      
 *    //fonte statica
 *      [{key,labels,model},{key,labels,model}]
 *    //fonte funzionale
 *    function(){}
 *    //fonte ajax
 *      type
 *      url
 *      params
 *      ajaxErrorHandler
 *      isAsync
 *      timeout

 *    //_________________
 * zebra
 * listElementsCursor
 * maxEntries
 * minInput
 * showNoResultVoice
 * noResultVoice
 * disableEmptySelection
 * onFirstListPopulationAutocompleteWithFirst: true,false,"onlyIfOneChoice"
 * autocompleteWithContainsAlso
 * chained[parametersDictionary]
 * onSelectionFocusChained
 * onSelectionChange
 * onFieldBlur
 * onFieldFocus
 * 
 * 
 * 
 * TODO:
 *      Sostituire datasource example5son con fonte ajax e verificare corretto caricamento in chain.
 *      Costante per ogni stringa presente nel sorgente e uniformazione lingua in inglese.
 *      multiple :: flag per abilitare selezione multipla
 *      multipleWay :: permette di specificare come usare selezioni multiple('and','or')
 *     
 * */

var DDTA = {
    IDLE_STATE: 0,
    SEARCHING_STATE: 1,
    SEARCH_PENDING_STATE: 2,
    instances: {},
    
    defaultConfig:{
        classesPrefix : "",
        addedClasses : {
            container : "",
            input : "",
            statusIcon : "",
            list : "",
            elements : "",
            noResultVoice: ""
        },
        fieldPlaceholder : "",
        typingMode : "disabled",
        dataModels : null,
        disableStatusIcon : false,
        statusIconPosition:"afterField",
        ifSuperChainerEmptyThenShow:"all",
        statusIcons:{
            normal: {classes: "", content: "v", cursor: "pointer"},
            opened: {classes: "", content: "^", cursor: "pointer"},
            loading:{classes: "", content: "@", cursor: "progress"}
        },
        zebra : true,
        cursors : {
            container : "normal",
            input : "pointer",
            statusIcon : "pointer",
            list : "pointer",
            elements : "pointer",
            noResultVoice: ""
        },
        animations : {
            listOpen: "fade",
            listClose: "fade"
        },
        maxEntries : 0,
        minInput : 0,
        showNoResultVoice : true,
        noResultVoice : "No entries",
        disableEmptySelection : false,
        onFirstListPopulationAutocompleteWithFirst: false,
        autocompleteWithContainsAlso : false,
        chained : [], 
        onSelectionFocusChained : false,
        onSelectionChange : null,
        onFieldBlur : null,
        onFieldFocus : null
    },
    
    
    autocomplete: function (ddName, elementSelected) {
        var parameters = this.instances[ddName].parameters;
        var field = $("#" + parameters.fieldId);
        var complexModelPreviewer = field.parent().find("#" + parameters.fieldId + "ComplexModelPreview");

        if (elementSelected != null && elementSelected.hasClass("noResultEntry"))
            return;

        if (elementSelected === null || $.trim(elementSelected) === "") {
            this.resetDD(ddName);
        } else {
            if (!complexModelPreviewer.length) {
                field.val(elementSelected.html());
            } else {
                complexModelPreviewer.html(elementSelected.html());
                field.hide();
                complexModelPreviewer.show();
            }

            if (elementSelected.attr("dd-el-key") && elementSelected.attr("dd-el-key") !== null && elementSelected.attr("dd-el-key") !== "undefined") {
                field.parent().find("#" + parameters.fieldId + "HiddenSelectedKey").first().val(elementSelected.attr("dd-el-key"));
            }

            if (parameters.chained) {
                $(parameters.chained).each(function (i, c) {
                    
                    if (typeof c === 'string' || c instanceof String){
                        var chainedParams = DDTA.instances[c].parameters;
                        chainedParams.dataSources[chainedParams.activeDataSource].source.chainerValue = elementSelected.attr("dd-el-key");
                        DDTA.resetDD(c);

                        //se devo fare focus, evito l'update perchè già triggerato dal focus stesso.
                        if (parameters.onSelectionFocusChained && i === 0) {
                            $("#" + chainedParams.fieldId).focus();
                        } else {
                            DDTA.updateListContent(ddName);
                        }
                    }else{ // case for chained inits with starting vals : c is still not a string but an object
                        c.parameters.dataSources[c.parameters.activeDataSource].source.chainerValue = elementSelected.attr("dd-el-key");
                    }
                });
            }
        }



        if ($.isFunction(parameters.onSelectionChange)) {
            parameters.onSelectionChange();
        }

        var list = $("#" + parameters.fieldId + "DD");
        if (list.is(":visible")) {
            this.closeList(ddName);
            this.setStatusIcon(ddName, "normal");
        }
    },
    autocompleteByLocalVal: function (ddName, value) {
        var parameters = this.instances[ddName].parameters;
        //tentativo di riconduzione ad opzioni presenti in tendina
        var lowercasedVal = $("#" + parameters.fieldId).val().toLowerCase();

        if (value)
            lowercasedVal = value.toLowerCase();

        var found = false;
        $("#" + parameters.fieldId + "DD").find("li").each(function () {
            if ($(this).text().toLowerCase() === lowercasedVal) {
                autocomplete(ddName, $(this));
                found = true;
            }
        });

        //se fallisce, 
        if (!found && parameters.typingMode !== "filterAndFreeText") {
            $("#" + parameters.fieldId).val("");
        }
    },
    autocompleteByKey: function (ddName, key, endingFunction) {
        var parameters = this.instances[ddName].parameters;
        var field = $("#" + parameters.fieldId);
        var list = $("#" + parameters.fieldId + "DD");

        if (!list) {
            list = field.parent().find("ul").first();
            if (!list)
                return false;
        }

        var found = false;

        list.find("li").each(function () {
            var value2Check = $(this).attr("dd-el-key");
            if ($.type(key) !== "string") {
                value2Check = parseFloat(value2Check);
            }
            if (value2Check === key) {
                DDTA.autocomplete(ddName, $(this));
                found = true;
                if ($.isFunction(endingFunction))
                    endingFunction();
                return;
            }
        });

    },
    //disattiva le voci già presenti, ma non più necessarie.
    filterDD: function (ddName) {
        var parameters = this.instances[ddName].parameters;
        var list = this.instances[ddName].elements.list;
        var input = this.instances[ddName].elements.valueField.val();
        var lowercasedInput = input.toLowerCase();

        if (parameters.showNoResultVoice) {
            list.find("li.noResultEntry").remove();
        }

        var zebraClass = "odd";
        var atLeastOne = false;

        var activeSource = parameters.dataSources[parameters.activeDataSource].source;
        list.find("li").each(function () {
            var chainerValue2Array = [];
            if (activeSource.chainerValue) {
                chainerValue2Array = $(this).attr("master-dd-valid-kyes").split(',');
            }
        
            if ( // is good for current input control
                 (parameters.typingMode === "disabled" ||
                    
                  (parameters.autocompleteWithContainsAlso && 
                   $(this).text().toLowerCase().indexOf(lowercasedInput) !== false
                  ) ||
                  
                  $(this).text().toLowerCase().indexOf(lowercasedInput) === 0
                 )
                 && // AND is good for parent controls
                 (
                  (
                   (!activeSource.chainerValue || activeSource.chainerValue === "") &&
                   parameters.ifSuperChainerEmptyThenShow === "all"
                  ) ||
                 
                  $(this).attr("master-dd-valid-kyes") === activeSource.chainerValue ||
                  //caso voci con master multiple a triggerare separate da ,
                  $.inArray(activeSource.chainerValue, chainerValue2Array) !== -1
                 ) 
               ) {
           
               // Va mostrato
                if (parameters.zebra) {
                    $(this).removeClass(parameters.classesPrefix + "odd");
                    $(this).removeClass(parameters.classesPrefix + "even");
                    $(this).addClass(parameters.classesPrefix + zebraClass);
                    zebraClass = (zebraClass === "odd") ? "even" : "odd";
                }

                $(this).show();
                atLeastOne = true;
                
            } else {
                
                // va nascosto
                $(this).hide();
            }
        });

        //gestione no result
        if (parameters.showNoResultVoice) {
            if (!atLeastOne) {
                list.append("<li class='" + parameters.classesPrefix + "DDElement " + parameters.addedClasses.elements + " " + parameters.addedClasses.noResultVoice + " noResultEntry " + parameters.classesPrefix + "odd'>" + parameters.noResultVoice + "</li>");
            }
        }

        if ($("#" + parameters.fieldId).is(":focus") && !list.is(":visible")) {
            this.openList(ddName);
            this.setStatusIcon(ddName, "opened");
        }

        this.endingStateCheck(ddName);

    },
 
    populateFromAjaxSource: function (ddName) {
        var parameters = this.instances[ddName].parameters;
        var activeSource = parameters.dataSources[parameters.activeDataSource].source;

        $.ajax({
            type: activeSource.type,
            url: activeSource.url,
            data: activeSource.params,
            success: function (res) {

                try {
                    var jsonSource = JSON.parse(res);
                } catch (e) {
                    console.log("Error : data for "+ddName+" was not recognized as a correct JSON format : "+e.message);
                    return false;
                }
                
                DDTA.populateList(ddName,jsonSource);

            },
            error: function (res) {
                if ($.isFunction(activeSource.ajaxErrorHandler)) {
                    activeSource.ajaxErrorHandler(res);
                }
            },
            async: activeSource.isAsync,
            timeout: activeSource.timeout
        });

        
    },
    
    updateListContent: function (ddName) {
        var parameters = this.instances[ddName].parameters;

//    console.log(theInput+" : start update");
//    console.log(this.instances[ddName].lockState);
        var list = this.instances[ddName].elements.list;
      
        this.setStatusIcon(ddName, "loading");

       
        switch (this.instances[ddName].lockState) {
            case this.IDLE_STATE:
//            console.log(parameters.fieldId + "was set to searching");

                this.instances[ddName].lockState = this.SEARCHING_STATEE;

                //fonte statica
                switch (parameters.dataSources[parameters.activeDataSource].type) {

                    case "static":
                        if (list.children("li").length === 0) {
                            this.populateList(ddName);
                        } 
                        this.filterDD(ddName);

                        break;
                        // fonte funzionale
                    case "function":
                        this.populateList(ddName,parameters.dataSources[parameters.activeDataSource].source());
                        break;
                        // fonte ajax
                    case "ajax":
                        if (parameters.typingMode === "disabled") {
                            parameters.currentInput = "";
                        } else {
                            parameters.currentInput = $("#" + parameters.fieldId).val();
                        }
                        this.populateFromAjaxSource(ddName);
                        break;
                        //errore
                    default:
                        console.log("Errore : tipo di data source invalido per aggiornamento dati in " + parameters.fieldId + "DD");
                        this.instances[ddName].lockState = this.IDLE_STATE;
                        return false;
                }
                break;
            case this.SEARCHING_STATEE:
//            console.log(parameters.fieldId + "was set to pending");
                this.instances[ddName].lockState = this.SEARCH_PENDING_STATE;
                break;

            case this.SEARCH_PENDING_STATE:
                break;
        }



    },
    populateList: function (ddName, source) {
        var parameters = this.instances[ddName].parameters;
        if(!source){
            source = parameters.dataSources[parameters.activeDataSource].source;
        }
        var list = $("#" + parameters.fieldId + "DD");
        list.html("");
        if (parameters.maxEntries) {
            source = $(source).slice(0, parameters.maxEntries);
        }

        if ((!source || !source.length)) {
            if (parameters.showNoResultVoice) {
                if (!parameters.noResultVoice) {
                    parameters.noResultVoice = "No results!";
                }
                list.append("<li class='" + parameters.classesPrefix + "DDElement " + parameters.addedClasses.elements + " " + parameters.addedClasses.noResultVoice + " noResultEntry " + parameters.classesPrefix + "odd'>" + parameters.noResultVoice + "</li>");
            }
        } else {

            $(source).each(function (i, value) {

                var model = null;
                if (value.dataModel && parameters.dataModels[value.dataModel]) {
                    model = parameters.dataModels[value.dataModel];
                } else if (parameters.dataModels) {
                    model = parameters.dataModels[Object.keys(parameters.dataModels)[0]];
                } else if ($.isPlainObject(value.labels)) {
                    model = "[_" + Object.keys(value.labels)[0] + "_]";
                } else {
                    console.log("Errore : impossibile definire il modello dati per " + parameters.fieldId + "DD. Elemento in questione:");
                    console.log(value);
                    return false;
                }

                var zebraClass = "";
                if (parameters.zebra) {
                    zebraClass = parameters.classesPrefix;
                    zebraClass += (i % 2 === 0) ? "odd" : "even";  // NB : non sono al contrario (gli indici partono da 0).
                }

                var element = $("<li dd-el-key='" + value.key + "' class='" + parameters.classesPrefix + "DDElement " + parameters.addedClasses.elements + " " + parameters.classesPrefix + zebraClass + "'></li>");
                if (value.labels) {
                    $.each(value.labels, function (field, fieldContent) {
                        model = model.replace("[_" + field + "_]", fieldContent);
                        element.attr("entryParam_" + field, fieldContent);
                    });
                }
                if (value.masterDdValidKyes) {
                    element.attr("master-dd-valid-kyes", value.masterDdValidKyes);
                }
                element.html(model);

                element.click(function () {
                    DDTA.autocomplete(ddName, element);
                });
                list.append(element);

            });

            //autocompletamento con prima voce : true -> sempre, onlyForSingleOptionCases -> solo se c'è una sola e forzata entry, false ->mai.
            if (parameters.onFirstListPopulationAutocompleteWithFirst === true ||
                    (parameters.onFirstListPopulationAutocompleteWithFirst === "ifOnlyOneChoice" && source.length === 1)
                    ) {
                this.autocomplete(ddName, list.find("li").first());
                parameters.onFirstListPopulationAutocompleteWithFirst = false;
            }
        }
//        console.log(this.instances[ddName].lockState);
        if ($("#" + parameters.fieldId).is(":focus") && !list.is(":visible")) {
            this.openList(ddName);
            this.setStatusIcon(ddName, "opened");
        }else{
            this.closeList(ddName);
            this.setStatusIcon(ddName, "normal");
        }

        list.find("li").css("cursor", parameters.cursors.elements);

        this.endingStateCheck(ddName);

//        console.log("end update");
//        console.log(this.instances[ddName].lockState);

    },
    endingStateCheck: function (ddName) {
        var parameters = this.instances[ddName].parameters;
        if (this.instances[ddName].lockState === DDTA.SEARCH_PENDING_STATE) {

//            console.log(parameters.fieldId + "was set to idle to allow pending resolution");
            this.instances[ddName].lockState = DDTA.IDLE_STATE;
            this.updateListContent(ddName);
        } else {
//            console.log(parameters.fieldId + "was set to idle");
            this.instances[ddName].lockState = DDTA.IDLE_STATE;
        }
    },
    
    
    focusHandler : function (ddName) {
        var instance = this.instances[ddName];
        var parameters = instance.parameters;
        var input = instance.elements.valueField.val();
        if (!parameters.minInput || input.length >= parameters.minInput) {

//            if (input !== null && input !== "") {
            if (parameters.typingMode === "disabled" || this.getSelectedElement(ddName) !== null) {
                this.resetDD(ddName);
            }
            this.updateListContent(ddName);
//            }

        }

        if ($.isFunction(parameters.onFieldFocus))
            parameters.onFieldFocus();
    },
    
    blurHandler : function (ddName) {
        var instance = this.instances[ddName];
        var parameters = instance.parameters;
        this.closeList(ddName);
        this.setStatusIcon(ddName, "normal");
        var hiddenVal = $("#" + instance.elements.valueField.attr("id") + "HiddenSelectedKey").val();
        instance.elements.list.find("li.selected").removeClass("selected");

        if (hiddenVal === "") {
            this.autocompleteByLocalVal(ddName);
        }

        //retry ed eventuale set alla prima voce se selezione nulla è impedita.
        hiddenVal = $("#" + instance.elements.valueField.attr("id") + "HiddenSelectedKey").val();
        if (hiddenVal === "" && parameters.disableEmptySelection) {
            this.autocomplete(ddName, instance.elements.list.find("li").first());
        }

        if ($.isFunction(parameters.onFieldBlur))
            parameters.onFieldBlur();

    },
    
    keyUpHandler : function (keyCode,ddName) {

        var instance = this.instances[ddName];
        var parameters = instance.parameters;

        $("#" + parameters.fieldId + "HiddenSelectedKey").val("");

        if (!parameters.minInput || $(this).val().length >= parameters.minInput) {
            switch (keyCode) {
                case 13:
                    var currSelected = instance.elements.list.find("li." + parameters.classesPrefix + "selected");
                    if (currSelected.length > 0) {
                        this.autocomplete(ddName, instance.elements.list.find("li." + parameters.classesPrefix + "selected"));
                        this.instances[ddName].lockState = this.IDLE_STATE;
                        return false;
                    }
                    break;
                case 37:
                case 39:
                    return false;

                case 40:
                    var li_selected = instance.elements.list.find("li." + parameters.classesPrefix + "DDElement." + parameters.classesPrefix + "selected").first();
                    /*se almeno uno è selezionato, seleziono il successivo*/
                    if (li_selected.length)
                    {
                        li_selected.removeClass(parameters.classesPrefix + "selected");
                        var foundNext = false;
                        var currentElement = li_selected;
                        while (!foundNext && currentElement.length) {
                            currentElement = currentElement.next("li").first();
                            if (currentElement.is(':visible')) {
                                foundNext = true;
                                currentElement.addClass(parameters.classesPrefix + "selected");
                            }
                        }

                    } else {
                        instance.elements.list.find("li").first().addClass(parameters.classesPrefix + "selected");
                    }

                    return false;

                case 38:
                    var li_selected = instance.elements.list.find("li." + parameters.classesPrefix + "selected").first();
                    /*se almeno uno è selezionato, seleziono il successivo*/
                    if (li_selected.length)
                    {
                        li_selected.removeClass(parameters.classesPrefix + "selected");
                        var foundNext = false;
                        var currentElement = li_selected;
                        while (!foundNext && currentElement.length) {
                            currentElement = currentElement.prev("li").first();
                            if (currentElement.is(':visible')) {
                                foundNext = true;
                                currentElement.addClass(parameters.classesPrefix + "selected");
                            }
                        }

                    } else {
                       instance.elements. list.find("li").last().addClass(parameters.classesPrefix + "selected");
                    }

                    return false;

                default:

                    this.updateListContent(ddName);
                    break;
            }
        } else {
            this.closeList(ddName);
            this.setStatusIcon(ddName, "normal");
        }

    },
    
    dataSourceCheck: function (dataSource){
        switch(dataSource.type){
            case "static":
                
                if( !$.isArray(dataSource.source)){
                    return "Error : data was not an array";
                }
                
                return "ok";
                
                // fonte funzionale
            case "function":
                if(!$.isFunction(dataSource.source)){
                    return "Error : data source function was not a function.";
                    
                }
                
                if( !$.isArray(dataSource.source())){
                    return "Error : data source function didn't return an array of elements.";
                    
                }
                return "ok";
                
                // fonte ajax
            case "ajax":
                var activeSource = dataSource.source;
 
                if (!activeSource.url || activeSource.url === ""){
                    return "Errore : non è stato definito l'url della sorgente ajax";
                }
                
                if (!$.isPlainObject(activeSource.params)){
                    activeSource.params = {};
                }
                
                if (!activeSource.type || !activeSource.type === ""){
                    activeSource.type = "POST";
                }
                if (!activeSource.isAsync || !activeSource.isAsync === ""){
                    activeSource.isAsync = false;
                }
                if (!activeSource.timeout || !activeSource.timeout === ""){
                    activeSource.timeout = 25000;
                }
                
                return "ok";
                //errore
            default:
                return "Errore : tipo di data source invalido";
        }
    },
    
    /*  
     * Function to store and init a new DD control.
     *           
     **/
    initDD: function (ddName, parameters) {
        
        /**Starting checks and base element detection
         * */
        if (this.instances[ddName]) {
            console.error("The name '"+ddName+"' is already in use for the control #"+this.instances[ddName].parameters.fieldId);
            return false;
        }
        
        if (!parameters.fieldId) {
            console.error("FieldId missing in "+ddName+" parameters.");
            return false;
        }
        
        var field = $("#" + parameters.fieldId);

        if (!field.length) {
            console.error("Element #"+parameters.fieldId+" was not found in DOM.");
            return false;
        }

        if (!parameters.dataSources || !parameters.activeDataSource || !parameters.dataSources[parameters.activeDataSource]) {
            console.error("DataSource "+parameters.activeDataSource+" is missing.");
            return false;
        }
        
        var sourceCheck = this.dataSourceCheck(parameters.dataSources[parameters.activeDataSource]);
        if(sourceCheck !== "ok"){
            console.error("Problem with datasource for "+ddName+" : "+sourceCheck);
        }
        
        //filling missing parmeters with defaults
        for (var attrname in this.defaultConfig) {
            if(!(attrname in parameters)){
                parameters[attrname] = this.defaultConfig[attrname]; 
            }
        }

        //creating all elements
        var list = $("<ul id='" + parameters.fieldId + "DD' class='" + parameters.classesPrefix + "DDList " + parameters.addedClasses.list + "'>");
        list.hide();

        var container = $("<div id='" + parameters.fieldId + "ContainerDD' class='" + parameters.classesPrefix + "containerDD " + parameters.addedClasses.container + "'></div>");

        var newField = field.clone(true);
        
        var statusIcon = $("<span class='" + parameters.statusIcons.normal.classes + parameters.classesPrefix + " statusIconDD " + parameters.addedClasses.statusIcon + "'></span>");
        if (parameters.disableStatusIcon) {
            statusIcon.hide();
        }
        
        var hiddenVal = $("<input type='hidden' id='" + field.attr("id") + "HiddenSelectedKey' name='" + ((field.attr("name")) ? field.attr("name") : field.attr("id")) + "-KeyVal' class='" + parameters.classesPrefix + "HiddenSelectedKey'></div>");
        
        //assembling
        if(parameters.statusIconPosition === "firstElement"){
            container.append(statusIcon);
        }
        container.append(newField);
        if(parameters.statusIconPosition === "afterField"){
            container.append(statusIcon);
        }
        container.append(list);
        if(parameters.statusIconPosition === "lastElement"){
            container.append(statusIcon);
        }
        container.append(hiddenVal);
        
        
        //Storing in instances
        this.instances[ddName] = {
            elements : {
                container : container,
                statusIcon : statusIcon,
                list : list,
                valueField : newField,
                keyField : hiddenVal
            },
            parameters : parameters,
            lockState : this.IDLE_STATE
                
        };
        
        // Field setup
        newField.attr("autocomplete", "off");
        if (parameters.fieldPlaceholder) {
            newField.attr("placeholder", parameters.fieldPlaceholder);
        }

        newField.addClass("inputDD");

        if (!parameters.typingMode)
            parameters.typingMode = "disabled";
        if (parameters.typingMode === "disabled") {
            newField.attr("readonly", true);
        }

        newField.focus(function(){DDTA.focusHandler(ddName);});

        newField.blur(function(){DDTA.blurHandler(ddName);});

        newField.keyup(function(e){DDTA.keyUpHandler(e,ddName);});

        // if configured, data models setup
        if (parameters.dataModels) {
            var complexModelPreview = $("<div id='" + field.attr("id") + "ComplexModelPreview' class='" + parameters.classesPrefix + "complexModelPreview'>");
            complexModelPreview.click(function () {
                DDTA.resetDD(ddName);
            });
            container.append(complexModelPreview);
            complexModelPreview.hide();
            this.instances[ddName].elements.complexModelPreview = complexModelPreview;
        }
        
        //status Icon setup
        statusIcon.click(function () {
            if (list.is(":visible")) {
                DDTA.closeList(ddName);
                DDTA.setStatusIcon(ddName, "normal");
            } else {
                newField.focus();
                DDTA.openList(ddName);
                DDTA.setStatusIcon(ddName, "opened");
                
            }
        });
        this.setStatusIcon(ddName, "normal");
        
        // Dom injection and source loading if static + starting val management
        field.replaceWith(container);
        
        if (parameters.dataSources[parameters.activeDataSource].type === "static" || parameters.minInput === 0) {
            this.updateListContent(ddName);
        }
                
        //Setting up startin value    
        if (parameters["startingSelectedVal"] || parameters["disableEmptySelection"]) {
            //disabling onselectionchange, this is not a change but a starting value
            parameters["DISABLEDonSelectionChange"] = parameters["onSelectionChange"];
            parameters["onSelectionChange"] = null;
            //setting the selection
            this.autocompleteByKey(ddName, parameters["startingSelectedVal"]);
            //Enabling selection change handler again
            parameters["onSelectionChange"] = parameters["DISABLEDonSelectionChange"];
            parameters["DISABLEDonSelectionChange"] = null;
        }
        
        //chaining  
        if (parameters.chained && parameters.chained.length > 0) {
            
            var finalChainedList = [];
            
            $(parameters.chained).each(function () {
                DDTA.initDD(this.name,this.parameters);
                finalChainedList.push(this.name);
            });
            parameters.chained = finalChainedList;
        }


        return parameters;
    },
    
    openList: function (ddName) {
        var parameters = this.instances[ddName].parameters;
        var list = $("#" + parameters.fieldId + "DD");
        switch (parameters.animations.listOpen) {
            case "none":
                //Known bug : se non ci sono animazioni, il blur occorre prima del click. quindi aspetto un secondo per animarle per non far sparire l'elemento cliccato.
                setTimeout(function () {
                    list.show();
                }, 200);
                break;
            case "fade":
                list.fadeIn(500);
                break;
        }

        $("#" + parameters.fieldId + "containerDD").addClass("openedList");
    },
    closeList: function (ddName) {
        var parameters = this.instances[ddName].parameters;
        var list = $("#" + parameters.fieldId + "DD");
        switch (parameters.animations.listOpen) {
            case "none":
                //Known bug : se non ci sono animazioni, il blur occorre prima del click. quindi aspetto un secondo per animarle per non far sparire l'elemento cliccato.
                setTimeout(function () {
                    list.hide();
                }, 200);
                break;
            case "fade":
                list.fadeOut(500);
                break;
        }

        $("#" + parameters.fieldId + "containerDD").removeClass("openedList");
    },
    
    setStatusIcon: function (ddName, status) {
        var parameters = this.instances[ddName].parameters;
        if (!parameters.disableStatusIcon && parameters.statusIcons[status]) {

            var container = $("#" + parameters.fieldId + "ContainerDD");
            var statusIcon = container.find(".statusIconDD").first();

            //cambio classi, cursor e content
            statusIcon.html(parameters.statusIcons[status].content);
            statusIcon.attr("class", "");
            statusIcon.addClass("statusIconDD " + parameters.statusIcons[status].classes);
            statusIcon.css("cursor", parameters.statusIcons[status].cursor);
            
        }
    },
    resetDD: function (ddName) {
        var parameters = this.instances[ddName].parameters;
        $("#" + parameters.fieldId + "ComplexModelPreview").html("").hide();
        $("#" + parameters.fieldId + "HiddenSelectedKey").val("");
        if (parameters.dataSources[parameters.activeDataSource].type !== "static") {
            $("#" + parameters.fieldId + "DD").html("").hide();
        } else {
            $("#" + parameters.fieldId + "DD").find("li.selected").removeClass("selected").show();
        }

        if ($.isFunction(parameters.onSelectionChange)) {
            parameters.onSelectionChange();
        }

        if (parameters.chained) {
            $(parameters.chained).each(function (i, c) {
                var chainedParams = DDTA.instances[c].parameters;
                chainedParams.dataSources[chainedParams.activeDataSource].source.chainerValue = null; // ogni reset resetta i chainer dei figli e non i propri : potrei chiamare una reset anche non in catena.
                DDTA.resetDD(c);
            });
        }

        $("#" + parameters.fieldId).show().val("");
        this.setStatusIcon(ddName, "normal");
    },
    getSelectedElement: function (ddName) {
        var parameters = this.instances[ddName].parameters;
        var currId = $("#" + parameters.fieldId + "HiddenSelectedKey").val();
        if (currId === "" || currId !== 0 && !currId) {
            return null;
        }

        return $("#" + parameters.fieldId + "DD ." + parameters.classesPrefix + "DDElement[dd-el-key=" + currId + "]");
    },
    getSelectedVal: function (ddName) {
        var parameters = this.instances[ddName].parameters;
        return $("#" + parameters.fieldId + "HiddenSelectedKey").val();
    }

};