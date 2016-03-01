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
 * statusIconPosition
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
 *      postProcessingFunction
 *      ajaxErrorHandler
 *      isAsync
 *      timeout

 *    //_________________
 * zebra
 * listElementsCursor
 * enableCssCopyFromOriginal
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
 *      
 *      check e correzione datasource in initDD. 
 *      conseguente rimozione di controlli simili (vd populateFromAjax)
 *      multiple :: flag per abilitare selezione multipla
 *      multipleWay :: permette di specificare come usare selezioni multiple('and','or')
 *      ----
 *      Cambiare chaining in filterDD ( almeno lì, forse anche altrove ). 
 *      Non storare chainerValues in DOM, ma fare tutto in struttura dati.
 *      Aggiungere stato visibilità alla voce e leggere quella per decidere se disegnare o no.
 *      ----
 *      VD TODO in updateListContent
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
        ifSuperChainerEmptyThenShow:"all",
        statusIcons:{
            normal: {classes: "fa fa-sort-desc", content: "", cursor: "pointer"},
            opened: {classes: "fa fa-sort-desc", content: "", cursor: "pointer"},
            loading:{classes: "fa fa-spinner fa-spin", content: "", cursor: "progress"}
        },
        statusIconPosition : "right",
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
        enableCssCopyFromOriginal : false,
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
                    
                    var chainedParams = DDTA.instances[c].parameters;
                    chainedParams.dataSources[chainedParams.activeDataSource].source.chainerValue = elementSelected.attr("dd-el-key");
                    DDTA.resetDD(c);

                    //se devo fare focus, evito l'update perchè già triggerato dal focus stesso.
                    if (parameters.onSelectionFocusChained && i === 0) {
                        $("#" + chainedParams.fieldId).focus();
                    } else {
                        this.updateListContent(ddName);
                    }
                });
            }
        }



        if ($.isFunction(parameters.onSelectionChange)) {
            parameters.onSelectionChange();
        }

        if (parameters.DISABLEDonSelectionChange) {
            parameters["onSelectionChange"] = parameters["DISABLEDonSelectionChange"];
            parameters["DISABLEDonSelectionChange"] = null;
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
                autocomplete(ddName, $(this));
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
        var list = $("#" + parameters.fieldId + "DD");
        var input = $("#" + parameters.fieldId).val();
        var lowercasedInput = input.toLowerCase();

        if (parameters.showNoResultVoice) {
            list.find("li.noResultEntry").remove();
        }

        var zebraClass = "odd";
        var atLeastOne = false;

        list.find("li").each(function () {
            var chainerValue2Array = [];
            if (parameters.dataSources[parameters.activeDataSource].source.chainerValue) {
                chainerValue2Array = $(this).attr("master-dd-valid-kyes").split(',');
            }


            if ((parameters.typingMode === "disabled" || (parameters.autocompleteWithContainsAlso && $(this).text().toLowerCase().indexOf(lowercasedInput) !== false) ||
                    $(this).text().toLowerCase().indexOf(lowercasedInput) === 0
                    )
                    &&
                    (!parameters.dataSources[parameters.activeDataSource].source.chainerValue || $(this).attr("master-dd-valid-kyes") === parameters.dataSources[parameters.activeDataSource].source.chainerValue ||
                            $.inArray(parameters.dataSources[parameters.activeDataSource].source.chainerValue, chainerValue2Array) !== -1) //caso voci con master multiple a triggerare separate da ,
                    ) {
                if (parameters.zebra) {
                    $(this).removeClass(parameters.classesPrefix + "odd");
                    $(this).removeClass(parameters.classesPrefix + "even");
                    $(this).addClass(parameters.classesPrefix + zebraClass);
                    zebraClass = (zebraClass === "odd") ? "even" : "odd";
                }

                $(this).show();
                atLeastOne = true;
            } else {
                $(this).hide();
            }
        });

        //gestione no result
        if (parameters.showNoResultVoice) {
            if (!atLeastOne) {
                list.append("<li class='" + parameters.classesPrefix + "DDElement " + parameters.addedClasses.listElements + " " + parameters.addedClasses.noResultVoice + " noResultEntry " + parameters.classesPrefix + "odd'>" + parameters.noResultVoice + "</li>");
            }
        }

        if ($("#" + parameters.fieldId).is(":focus") && !list.is(":visible")) {
            this.openList(ddName);
        }
        this.setStatusIcon(ddName, "opened");

        this.endingStateCheck(ddName);

    },
    /**
     * @param {object} parameters deve contenere i parametri di DD.
     **/
    populateFromAjaxSource: function (ddName) {
        var parameters = this.instances[ddName].parameters;
        var activeSource = parameters.dataSources[parameters.activeDataSource].source;
 
        if (!activeSource.url || activeSource.url === "")
            return;

        if (!activeSource.type || !activeSource.type === "")
            activeSource.type = "POST";
        if (!activeSource.isAsync || !activeSource.isAsync === "")
            activeSource.isAsync = false;
        if (!activeSource.timeout || !activeSource.timeout === "")
            activeSource.timeout = 25000;

        $.ajax({
            type: activeSource.type,
            url: activeSource.url,
            data: $.param(activeSource.params),
            success: function (res) {

                if ($.isFunction(activeSource.postProcessingFunction)) {
                    res = activeSource.postProcessingFunction(res);
                }
                this.populateList(ddName,res);

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
        var list = $("#" + parameters.fieldId + "DD");

        /**
         * @TODO: rifare, cambiare: non può stare qui e non si può risolvere ifSuperChainerEmptyThenShow qui e così
         *      spostare in filterDD. nell'ajax server side, e nella function fanno da sè. 
         * */
        if (parameters.dataSources[parameters.activeDataSource].source.chainSentence &&
                (!parameters.dataSources[parameters.activeDataSource].source.chainerValue || parameters.dataSources[parameters.activeDataSource].source.chainerValue === "") &&
                parameters.ifSuperChainerEmptyThenShow !== "all")
            return;

        this.setStatusIcon(ddName, "loading");

        if (parameters)
            switch (this.instances[ddName].lockState) {
                case DDTA.IDLE_STATE:
//            console.log(parameters.fieldId + "was set to searching");

                    this.instances[ddName].lockState = DDTA.SEARCHING_STATEE;

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
                        case "CMS_AJAX":
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
                            this.instances[ddName].lockState = DDTA.IDLE_STATE;
                            return false;
                    }
                    break;
                case DDTA.SEARCHING_STATEE:
//            console.log(parameters.fieldId + "was set to pending");
                    this.instances[ddName].lockState = DDTA.SEARCH_PENDING_STATE;
                    break;

                case DDTA.SEARCH_PENDING_STATE:
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
                list.append("<li class='" + parameters.classesPrefix + "DDElement " + parameters.addedClasses.listElements + " " + parameters.addedClasses.noResultVoice + " noResultEntry " + parameters.classesPrefix + "odd'>" + parameters.noResultVoice + "</li>");
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

                var element = $("<li dd-el-key='" + value.key + "' class='" + parameters.classesPrefix + "DDElement " + parameters.addedClasses.listElements + " " + parameters.classesPrefix + zebraClass + "'></li>");
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
        }
        this.setStatusIcon(ddName, "opened");

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
    /*  
     * Function to store and init a new DD control.
     *           
     **/
    initDD: function (ddName, parameters) {
        
    /**Starting checks and base element detection
     * */
        if (!parameters.fieldId) {
            console.error("FieldId missing in parameters.");
        }
        
        var field = $("#" + parameters.fieldId);

        if (!field.length) {
            console.error("Element #"+parameters.fieldId+" was not found in DOM.");
        }

        if (!parameters.dataSources || !parameters.activeDataSource || !parameters.dataSources[parameters.activeDataSource]) {
            console.error("DataSource "+parameters.activeDataSource+" is missing.");
        }
        
    //filling missing parmeters with defaults
        for (var attrname in this.defaultConfig) {
            if(!(attrname in parameters)){
                parameters[attrname] = this.defaultConfig[attrname]; 
            }
        }

        var list = $("<ul id='" + parameters.fieldId + "DD' class='" + parameters.classesPrefix + "DDList " + parameters.addedClasses.list + "'>");

        list.css({"position": "absolute",
            "width": "100%",
            "display": "none",
            "z-index": "99"});

        var container = $("<div id='" + parameters.fieldId + "ContainerDD' class='" + parameters.classesPrefix + "containerDD " + parameters.addedClasses.container + "'></div>");


        if (parameters.enableCssCopyFromOriginal) {
            container.css({
                display: (field.css("display")) ? field.css("display") : "inline",
                position: (field.css("position") !== "static") ? field.css("position") : "relative",
                "margin-left": field.css("margin-left"),
                "padding-left": field.css("padding-left"),
                "margin-right": field.css("margin-right"),
                "padding-right": field.css("padding-right"),
                "margin-top": field.css("margin-top"),
                "padding-top": field.css("padding-top"),
                "margin-bottom": field.css("margin-bottom"),
                "padding-bottom": field.css("padding-bottom"),
                float: field.css("float"),
                "vertical-align": field.css("vertical-align"),
                clear: field.css("clear"),
                top: field.css("top"),
                right: field.css("right"),
                left: field.css("left"),
                bottom: field.css("bottom")
            });

            field.css({
                margin: 0,
                padding: 0,
                top: "",
                right: "",
                left: "",
                bottom: ""
            });
        }

        var newField = field.clone(true);

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

        newField.focus(function () {
            var input = $(this).val();
            if (!parameters.minInput || input.length >= parameters.minInput) {

//            if (input !== null && input !== "") {
                if (parameters.typingMode === "disabled" || DDTA.getSelectedElement(ddName) !== null) {
                    DDTA.resetDD(ddName);
                }
                DDTA.updateListContent(ddName);
//            }

                if (!list.is(":visible")) {
                    DDTA.openList(ddName);
                    DDTA.setStatusIcon(ddName, "opened");
                }
            }

            if ($.isFunction(parameters.onFieldFocus))
                parameters.onFieldFocus();
        });

        newField.blur(function () {
            DDTA.closeList(ddName);
            DDTA.setStatusIcon(ddName, "normal");
            var hiddenVal = $("#" + field.attr("id") + "HiddenSelectedKey").val();
            list.find("li.selected").removeClass("selected");

            if (hiddenVal === "") {
                DDTA.autocompleteByLocalVal(ddName);
            }

            //retry ed eventuale set alla prima voce se selezione nulla è impedita.
            hiddenVal = $("#" + field.attr("id") + "HiddenSelectedKey").val();
            if (hiddenVal === "" && parameters.disableEmptySelection) {
                DDTA.autocomplete(ddName, list.find("li").first());
            }

            if ($.isFunction(parameters.onFieldBlur))
                parameters.onFieldBlur();

        });

        newField.keyup(function (e) {

            $("#" + parameters.fieldId + "HiddenSelectedKey").val("");

            if (!parameters.minInput || $(this).val().length >= parameters.minInput) {
                switch (e.keyCode) {
                    case 13:
                        var currSelected = list.find("li." + parameters.classesPrefix + "selected");
                        if (currSelected.length > 0) {
                            DDTA.autocomplete(ddName, list.find("li." + parameters.classesPrefix + "selected"));
                            DDTA.instances[ddName].lockState = DDTA.IDLE_STATE;
                            return false;
                        }
                        break;
                    case 37:
                    case 39:
                        return false;

                    case 40:
                        var li_selected = list.find("li." + parameters.classesPrefix + "DDElement." + parameters.classesPrefix + "selected").first();
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
                            list.find("li").first().addClass(parameters.classesPrefix + "selected");
                        }

                        return false;

                    case 38:
                        var li_selected = list.find("li." + parameters.classesPrefix + "selected").first();
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
                            list.find("li").last().addClass(parameters.classesPrefix + "selected");
                        }

                        return false;

                    default:

                        DDTA.updateListContent(ddName);
                        break;
                }
            } else {
                DDTA.closeList(ddName);
                DDTA.setStatusIcon(ddName, "normal");
            }

        });



        container.append(newField);
        if (parameters.dataModels) {
            var complexModelPreview = $("<div id='" + field.attr("id") + "ComplexModelPreview' class='" + parameters.classesPrefix + "complexModelPreview'>");
            complexModelPreview.click(function () {
                DDTA.resetDD(ddName);
            });
            container.append(complexModelPreview);
            complexModelPreview.hide();
        }
        container.append(list);
        field.replaceWith(container);
        var hiddenVal = $("<input type='hidden' id='" + field.attr("id") + "HiddenSelectedKey' name='" + ((field.attr("name")) ? field.attr("name") : field.attr("id")) + "-KeyVal' class='" + parameters.classesPrefix + "HiddenSelectedKey'></div>");
        container.append(hiddenVal);

        container.css("position", "relative");
        if (!parameters.disableStatusIcon) {
            var statusIcon = $("<span class='" + parameters.statusIcons.normal.classes + parameters.classesPrefix + " statusIconDD " + parameters.addedClasses.statusIcon + "'></span>");

            switch (parameters.statusIconPosition) {
                case "right":

                    container.css({
                        position: "relative",
//                    "padding-right":"45px"
                    });

                    statusIcon.css({
                        display: "inline-block",
//                    position: "absolute",
                        float: "right" //: "15px"
                    });

                    break;
                case "left":

                    container.css({
                        position: "relative",
//                    "padding-left":"45px"
                    });

                    statusIcon.css({
                        display: "inline-block",
//                    position: "absolute",
                        float: "left"//: "15px"
                    });

                    break;

            }
            statusIcon.click(function () {
                if (list.is(":visible")) {
                    DDTA.closeList(ddName);
                    DDTA.setStatusIcon(ddName, "normal");
                } else {
                    DDTA.openList(ddName);
                    DDTA.setStatusIcon(ddName, "opened");
                    newField.focus();
                }
            });
            container.prepend(statusIcon);


            if ($.isFunction(parameters.onInitEnd))
                parameters.onInitEnd();
        }

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

        this.setStatusIcon(ddName, "normal");
        
        if (parameters.dataSources[parameters.activeDataSource].type === "static" || parameters.minInput === 0) {
            this.updateListContent(ddName);
        }
           
        if (parameters["startingSelectedVal"] || parameters["disableEmptySelection"]) {
            parameters["DISABLEDonSelectionChange"] = parameters["onSelectionChange"];
            parameters["onSelectionChange"] = null;
            autocompleteByKey(ddName, parameters["startingSelectedVal"]);
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

            if (parameters.statusIconPosition && parameters.statusIconPosition !== "manual") {
                var finalTop = container.height() / 2 - statusIcon.height() / 2;

                if (finalTop <= 0)
                    finalTop = 20;

                statusIcon.css({"top": finalTop + "px"});
            }
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