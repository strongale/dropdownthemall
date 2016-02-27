/**
 * Lista dei parametri
 * 
 * fieldId
 * classesPrefix
 * addedClasses
 * fieldPlaceholder
 * typingMode
 * dataModels{name:model}
 * currentACStatus
 * disableStatusIcon
 * statusIcons:[normal,loading,opened_ognuna{content,classes,cursor}]
 * statusIconPosition
 * activeDataSource
 * dataSources
 *      ifSuperChainerEmptyThenShow
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
 *    //Per cms__________
 *      subject
 *      labels
 *      key
 *      chainSentence
 *      constraints?? interno??
 *    //_________________
 * zebra
 * listElementsCursor
 * enableCssCopyFromOriginal
 * maxEntries
 * minInput
 * showNoResultVoice
 * noResultVoice
 * noResultVoiceClasses
 * disableEmptySelection
 * onFirstListPopulationAutocompleteWithFirst: true,false,"onlyIfOneChoice"
 * autocompleteWithContainsAlso
 * chained[parametersDictionary]
 * onSelectionFocusChained
 * onSelectionChange
 * onFieldBlur
 * onFieldFocus
 * */


var IDLE_STATE = 0;
var SEARCHING_STATE = 1;
var SEARCH_PENDING_STATE = 2;

var lockStates = {};

function autocomplete(parameters, elementSelected) {
    var field = $("#" + parameters.fieldId);
    var complexModelPreviewer = field.parent().find("#" + parameters.fieldId + "ComplexModelPreview");

    if(elementSelected!= null && elementSelected.hasClass("noResultEntry")) return;

    if (elementSelected === null || $.trim(elementSelected) === "") {
        resetAC(parameters); 
    } else {
        if (!complexModelPreviewer.length) {
            field.val(elementSelected.html());
        }
        else {
            complexModelPreviewer.html(elementSelected.html());
            field.hide();
            complexModelPreviewer.show();
        }

        if(elementSelected.attr("ac-value") && elementSelected.attr("ac-value")!==null && elementSelected.attr("ac-value")!=="undefined"){
            field.parent().find("#" + parameters.fieldId + "HiddenSelectedKey").first().val(elementSelected.attr("ac-value"));
        }

        if (parameters.chained) {
            $(parameters.chained).each(function(i,c){    
                
                c.dataSources[c.activeDataSource].source.chainerValue = elementSelected.attr("ac-value");
                resetAC(c);
                
                //se devo fare focus, evito l'update perchè già triggerato dal focus stesso.
                if(parameters.onSelectionFocusChained && i===0){
                    $("#"+c.fieldId).focus();
                }else{
                   updateListContent(c); 
                }
            });
        }
    }

    

    if ($.isFunction(parameters.onSelectionChange)) {
        parameters.onSelectionChange();
    }
    
    if(parameters.DISABLEDonSelectionChange){
        parameters["onSelectionChange"] = parameters["DISABLEDonSelectionChange"];
        parameters["DISABLEDonSelectionChange"] = null;
    }

    var list = $("#" + parameters.fieldId + "AC");
    if(list.is(":visible")){
        closeList(parameters);
        setStatusIcon(parameters,"normal");
    }
}

function autocompleteByLocalVal(parameters,value){
    //tentativo di riconduzione ad opzioni presenti in tendina
      var lowercasedVal = $("#" + parameters.fieldId).val().toLowerCase();
      
      if(value)
          lowercasedVal = value.toLowerCase();
      
      var found = false;
      $("#" + parameters.fieldId + "AC").find("li").each(function() {
          if ($(this).text().toLowerCase() === lowercasedVal) {
              autocomplete(parameters, $(this));
              found = true;
          }
      });

      //se fallisce, 
      if (!found && parameters.typingMode!=="filterAndFreeText"){
              $("#" + parameters.fieldId).val("");
      }
}

function autocompleteByKey(parameters, key, endingFunction) {
    var field = $("#" + parameters.fieldId);
    var list = $("#" + parameters.fieldId + "AC");

    if (!list) {
        list = field.parent().find("ul").first();
        if (!list)
            return false;
    }

    var found = false;

    list.find("li").each(function() {
        var value2Check = $(this).attr("ac-value");
        if($.type(key)!=="string"){
            value2Check = parseFloat(value2Check);
        }
        if (value2Check === key) {
            autocomplete(parameters, $(this));
            found = true;
            if($.isFunction(endingFunction)) endingFunction();         
            return;
        }
    });
    
    //parte x il cms
    if(!found){
        if(parameters.dataSources[parameters.activeDataSource].type!=="static"){
            var handlers = {success: function(data) {
                    var results = $.parseJSON(data);
                    if(data.length){
                       populateList(results, parameters);
                       autocomplete(parameters,list.find("li").first());
                       if($.isFunction(endingFunction)) endingFunction();
                    }           
                }
            };

            var moddedParameters = $.extend(true, {}, parameters);
            var constraints = moddedParameters.dataSources[moddedParameters.activeDataSource].source.constraints;
            if(!constraints)constraints="";
            if($.trim(constraints)!==""){
                constraints+=" AND ";
            }
            constraints+=parameters.dataSources[parameters.activeDataSource].source.key+" = "+key;
            
            moddedParameters.dataSources[moddedParameters.activeDataSource].source.constraints = constraints;
            moddedParameters.currentInput = ""; //ignora current input
            
            delete moddedParameters.onSelectionFocusChained;
            delete moddedParameters.onSelectionChange;
            delete moddedParameters.onFieldBlur;
            delete moddedParameters.onFieldFocus;
            delete moddedParameters.noResultVoice;
            delete moddedParameters.noResultVoiceClasses;
            delete moddedParameters.disableEmptySelection;
            delete moddedParameters.chained;
            
            ajaxCall("common/getACListContent", moddedParameters, handlers);
        }else if(parameters.disableEmptySelection){
            autocomplete(parameters,list.find("li").first());
        }
    }
}

//disattiva le voci già presenti, ma non più necessarie.
function filterAC(parameters) {

    var list = $("#" + parameters.fieldId + "AC");
    var input = $("#" + parameters.fieldId).val();
    var lowercasedInput = input.toLowerCase();

    if(parameters.showNoResultVoice) {
        list.find("li.noResultEntry").remove();
    }
    
    var zebraClass = "odd";
    var atLeastOne = false;

    list.find("li").each(function() {
        var chainerValue2Array=[];
        if(parameters.dataSources[parameters.activeDataSource].source.chainerValue){
            chainerValue2Array=$(this).attr("master-ac-relative-values").split(',');
        }

        
        if(     ( parameters.typingMode==="disabled" ||  (parameters.autocompleteWithContainsAlso && $(this).text().toLowerCase().indexOf(lowercasedInput) !== false) ||
                    $(this).text().toLowerCase().indexOf(lowercasedInput) === 0
                ) 
                &&      
                (!parameters.dataSources[parameters.activeDataSource].source.chainerValue || $(this).attr("master-ac-relative-values")===parameters.dataSources[parameters.activeDataSource].source.chainerValue ||
                 $.inArray(parameters.dataSources[parameters.activeDataSource].source.chainerValue,chainerValue2Array)!==-1) //caso voci con master multiple a triggerare separate da ,
           ){
            if(parameters.zebra){
                $(this).removeClass(parameters.classesPrefix+"odd");
                $(this).removeClass(parameters.classesPrefix+"even");
                $(this).addClass(parameters.classesPrefix+zebraClass);
                zebraClass = (zebraClass==="odd")?"even":"odd";
            }
       
            $(this).show();
            atLeastOne = true;
        }
        else {
            $(this).hide();
        }
    });
    
    //gestione no result
    if(parameters.showNoResultVoice) {
        if(!atLeastOne){
            list.append("<li class='" + parameters.classesPrefix + "ACElement "+ parameters.addedClasses.listElements +" "+ parameters.noResultVoiceClasses + " noResultEntry " + parameters.classesPrefix + "odd'>"+parameters.noResultVoice+"</li>");   
        }
    }
    
    if($("#" + parameters.fieldId).is(":focus") && !list.is(":visible")){
        openList(parameters);
    }
    setStatusIcon(parameters,"opened");

    endingStateCheck(parameters);

}

/**
 * @param {object} parameters deve contenere i parametri di AC.
 **/
function populateFromAjaxSource(parameters) {
    var activeSource = parameters.dataSources[parameters.activeDataSource].source;
    //parte x il cms
    if (activeSource.type==="CMS_AJAX"){
        
        var handlers = {success: function(data) {
                data = $.parseJSON(data);
                if($.isFunction(activeSource.postProcessingFunction)){
                    data = activeSource.postProcessingFunction(data);
                }
                populateList(data, parameters);
            }
        };

        var cleanedParams = jQuery.extend(true, {}, parameters);
        console.log(cleanedParams);
        delete cleanedParams.onSelectionFocusChained;
        delete cleanedParams.onSelectionChange;
        delete cleanedParams.onFieldBlur;
        delete cleanedParams.onFieldFocus;
        delete cleanedParams.noResultVoice;
        delete cleanedParams.noResultVoiceClasses;
        delete cleanedParams.disableEmptySelection;
        delete cleanedParams.chained;
        
        ajaxCall("common/getACListContent", cleanedParams, handlers);
        
    }//parte generica
    else{
        if(!activeSource.url || activeSource.url === "") return;
        
        if(!activeSource.type || !activeSource.type === "") activeSource.type = "POST";
        if(!activeSource.isAsync || !activeSource.isAsync === "") activeSource.isAsync = false;
        if(!activeSource.timeout || !activeSource.timeout === "") activeSource.timeout = 25000;
        
        $.ajax({
            type: activeSource.type,
            url: activeSource.url,
            data: $.param(activeSource.params),
            success: function(res) {
                        
                        if($.isFunction(activeSource.postProcessingFunction)){
                            res = activeSource.postProcessingFunction(res);
                        }
                        populateList(res, parameters);
                        
            },
            error: function(res) {
                        if($.isFunction(activeSource.ajaxErrorHandler)){  
                            activeSource.ajaxErrorHandler(res);
                        }
            },
            async:activeSource.isAsync,
            timeout: activeSource.timeout
        });

    }
}

function updateListContent(parameters) {

//    console.log(theInput+" : start update");
//    console.log(lockStates);
    var list = $("#" + parameters.fieldId + "AC");

    if(parameters.dataSources[parameters.activeDataSource].source.chainSentence && 
       (!parameters.dataSources[parameters.activeDataSource].source.chainerValue || parameters.dataSources[parameters.activeDataSource].source.chainerValue==="") &&
       parameters.ifSuperChainerEmptyThenShow!=="all" ) return;

    setStatusIcon(parameters,"loading");

    if(parameters)
    switch (lockStates[parameters.fieldId]) {
        case IDLE_STATE:
//            console.log(parameters.fieldId + "was set to searching");

            lockStates[parameters.fieldId] = SEARCHING_STATE;

            //fonte statica
            switch (parameters.dataSources[parameters.activeDataSource].type){
                
                case "static":
                    if (list.children("li").length === 0) {
                        populateList(parameters.dataSources[parameters.activeDataSource].source, parameters);
                    } else {
                        filterAC(parameters);
                    }
                    break;
                // fonte funzionale
                case "function": 
                    populateList(parameters.dataSources[parameters.activeDataSource].source(), parameters);
                    break;
                // fonte ajax
                case "ajax":case "CMS_AJAX":
                    if(parameters.typingMode==="disabled"){
                        parameters.currentInput = "";
                    }else{
                        parameters.currentInput = $("#" + parameters.fieldId).val();
                    }
                    populateFromAjaxSource(parameters);
                    break;
                //errore
                default:
                    console.log("Errore : tipo di data source invalido per aggiornamento dati in " + parameters.fieldId + "AC");
                    lockStates[parameters.fieldId] = IDLE_STATE;
                    return false;
            }
            break;
        case SEARCHING_STATE:
//            console.log(parameters.fieldId + "was set to pending");
            lockStates[parameters.fieldId] = SEARCH_PENDING_STATE;
            break;

        case SEARCH_PENDING_STATE:
            break;
    }

    

}

function populateList(source, parameters) {

    var list = $("#" + parameters.fieldId + "AC");
    list.html("");
    if (parameters.maxEntries) {
        source = $(source).slice(0, parameters.maxEntries);
    }

    if ((!source || !source.length)){  
        if(parameters.showNoResultVoice ) {
            if(!parameters.noResultVoice){
                parameters.noResultVoice = "No results!";
            }
            list.append("<li class='" + parameters.classesPrefix + "ACElement "+ parameters.addedClasses.listElements +" "+ parameters.noResultVoiceClasses + " noResultEntry " + parameters.classesPrefix + "odd'>"+parameters.noResultVoice+"</li>");   
        }
    }else{

        $(source).each(function(i, value) {

            var model = null;
            if (value.dataModel && parameters.dataModels[value.dataModel]) {
                model = parameters.dataModels[value.dataModel];
            }
            else if (parameters.dataModels) {
                model = parameters.dataModels[Object.keys(parameters.dataModels)[0]];
            }
            else if ($.isPlainObject(value.labels)) {
                model = "[_" + Object.keys(value.labels)[0] + "_]";
            }
            else {
                console.log("Errore : impossibile definire il modello dati per " + parameters.fieldId + "AC. Elemento in questione:");
                console.log(value);
                return false;
            }

            var zebraClass = "";
            if (parameters.zebra) {
                zebraClass = parameters.classesPrefix;
                zebraClass += (i % 2 === 0) ? "odd" : "even";  // NB : non sono al contrario (gli indici partono da 0).
            }   

            var element = $("<li ac-value='" + value.key + "' class='" + parameters.classesPrefix + "ACElement " + parameters.addedClasses.listElements + " " + parameters.classesPrefix + zebraClass + "'></li>");
            if(value.labels){
                $.each(value.labels, function(field, fieldContent) {
                    model = model.replace("[_" + field + "_]", fieldContent);
                    element.attr("entryParam_"+field,fieldContent);
                });
            }
            if(value.masterAcRelativeValues){
                element.attr("master-ac-relative-values",value.masterAcRelativeValues);
            }
            element.html(model);

            element.click(function() {
                autocomplete(parameters, element);
            });
            list.append(element);

        });
        
        //autocompletamento con prima voce : true -> sempre, onlyForSingleOptionCases -> solo se c'è una sola e forzata entry, false ->mai.
        if(parameters.onFirstListPopulationAutocompleteWithFirst === true || 
           (parameters.onFirstListPopulationAutocompleteWithFirst==="ifOnlyOneChoice" && source.length===1)
          ){
            autocomplete(parameters,list.find("li").first());
            parameters.onFirstListPopulationAutocompleteWithFirst = false;
        }
    }
//        console.log(lockStates);
    if($("#" + parameters.fieldId).is(":focus") && !list.is(":visible")){
        openList(parameters); 
    }
    setStatusIcon(parameters,"opened");
    
    list.find("li").css("cursor",parameters.listElementsCursor);
    
    endingStateCheck(parameters);

//        console.log("end update");
//        console.log(lockStates);

}

function endingStateCheck(parameters) {
    if (lockStates[parameters.fieldId] === SEARCH_PENDING_STATE) {

//            console.log(parameters.fieldId + "was set to idle to allow pending resolution");
        lockStates[parameters.fieldId] = IDLE_STATE;
        updateListContent(parameters);
    } else {
//            console.log(parameters.fieldId + "was set to idle");
        lockStates[parameters.fieldId] = IDLE_STATE;
    }
}

/*TODO : 
 *      multiple :: flag per abilitare selezione multipla
 *      multipleWay :: permette di specificare come usare selezioni multiple('and','or')
 *      */
function initializeAC(parameters) {

    var field = $("#" + parameters.fieldId);

    //locksControl
    lockStates[parameters.fieldId] = IDLE_STATE;

    //conf statuses
    if(!parameters.classesPrefix){
        parameters.classesPrefix = "";
    }
    
    if(!parameters.addedClasses){
        parameters.addedClasses = {};
    }
    if(!parameters.addedClasses.container){
        parameters.addedClasses.container = "";
    }
    if(!parameters.addedClasses.list){
        parameters.addedClasses.list = "";
    }
    if(!parameters.addedClasses.listElements){
        parameters.addedClasses.listElements = "";
    }    
    if(!parameters.addedClasses.statusIcon){
        parameters.addedClasses.statusIcon = "";
    }
    
    if(!parameters.animations){
        parameters.animations = {};
    }
    if(!parameters.animations.listOpen){
        parameters.animations.listOpen = "fade";
    }
    if(!parameters.animations.listClose){
        parameters.animations.listClose = "fade";
    }
    
    if(!parameters.statusIcons){
        parameters.statusIcons = {normal:{classes:"fa fa-sort-desc",content:"",cursor:"pointer"},
                                  opened:{classes:"fa fa-sort-desc",content:"",cursor:"pointer"},
                                  loading:{classes:"fa fa-spinner fa-spin",content:"",cursor:"progress"}};
    }
    
    if(!parameters.statusIcons.normal){
        parameters.statusIcons.normal = {classes:"fa fa-sort-desc",content:"",cursor:"pointer"};
    }
    
    if(!parameters.statusIcons.opened){
        parameters.statusIcons.opened = {classes:"fa fa-sort-desc",content:"",cursor:"pointer"};
    }
    
    if(!parameters.statusIcons.loading){
        parameters.statusIcons.loading = {classes:"fa fa-spinner fa-spin",content:"",cursor:"progress"};
    }
    
    if(!parameters.statusIconPosition){
        parameters.statusIconPosition = "right";
    }
    
    if(!parameters.dataSources){
        parameters.dataSources = {"default":parameters.dataSource};
        parameters.activeDataSource = "default";
    }
    
    //questo if è solo per il cms o meglio solo per beproved perchè non hovoglia di aggiungere l'attributo in tutti i live search
    if(parameters.dataSources[parameters.activeDataSource].source.subject && !parameters.dataSources[parameters.activeDataSource].source.type){
        parameters.dataSources[parameters.activeDataSource].source.type="CMS_AJAX";
    }
    
    var list = $("<ul id='" + parameters.fieldId + "AC' class='" + parameters.classesPrefix + "ACList "+ parameters.addedClasses.list +"'>");

    list.css({"position": "absolute",
              "width": "100%",
        "display": "none",
        "z-index": "99"});

    var container = $("<div id='" + parameters.fieldId + "ContainerAC' class='" + parameters.classesPrefix + "containerAC "+ parameters.addedClasses.container +"'></div>");
    

    if (parameters.enableCssCopyFromOriginal) {
        container.css({
            display: (field.css("display")) ? field.css("display") : "inline",
            position: (field.css("position")!=="static") ? field.css("position") : "relative",
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
    
    newField.addClass("inputAC");
    
    if(!parameters.typingMode) parameters.typingMode = "disabled";
    if(parameters.typingMode==="disabled") {
        newField.attr("readonly", true);
    }    

    newField.focus(function() {
        var input = $(this).val();
        if (!parameters.minInput || input.length >= parameters.minInput) {
       
//            if (input !== null && input !== "") {
            if(parameters.typingMode==="disabled" || getSelectedElement(parameters)!==null){
                resetAC(parameters);
            }
            updateListContent(parameters);
//            }

            if(!list.is(":visible")){
                openList(parameters);
                setStatusIcon(parameters,"opened");
            }
        }
        
        if($.isFunction(parameters.onFieldFocus))parameters.onFieldFocus();
    });

    newField.blur(function() {
        closeList(parameters);
        setStatusIcon(parameters,"normal");
        var hiddenVal = $("#" + field.attr("id") + "HiddenSelectedKey").val();
        list.find("li.selected").removeClass("selected");
    
        if(hiddenVal === ""){
            autocompleteByLocalVal(parameters);
        }
        
        //retry ed eventuale set alla prima voce se selezione nulla è impedita.
        hiddenVal = $("#" + field.attr("id") + "HiddenSelectedKey").val();
        if(hiddenVal === "" && parameters.disableEmptySelection){
            autocomplete(parameters,list.find("li").first());
        }
        
        if($.isFunction(parameters.onFieldBlur))parameters.onFieldBlur();
        
    });

    newField.keyup(function(e) {

        $("#" + parameters.fieldId + "HiddenSelectedKey").val("");

        if (!parameters.minInput || $(this).val().length >= parameters.minInput) {
            switch (e.keyCode) {
                case 13:
                    var currSelected = list.find("li." + parameters.classesPrefix + "selected");
                    if(currSelected.length>0){
                        autocomplete(parameters, list.find("li." + parameters.classesPrefix + "selected"));
                        lockStates[parameters.fieldId] = IDLE_STATE;
                        return false;
                    }
                    break;
                case 37:
                case 39:
                    return false;

                case 40:
                    var li_selected = list.find("li." + parameters.classesPrefix + "ACElement." + parameters.classesPrefix + "selected").first();
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

                    updateListContent(parameters);
                    break;
            }
        } else {
            closeList(parameters);
            setStatusIcon(parameters,"normal");
        }

    });



    container.append(newField);
    if (parameters.dataModels) {
        var complexModelPreview = $("<div id='" + field.attr("id") + "ComplexModelPreview' class='" + parameters.classesPrefix + "complexModelPreview'>");
        complexModelPreview.click(function() {        
            resetAC(parameters);
        });
        container.append(complexModelPreview);
        complexModelPreview.hide();
    }
    container.append(list);
    field.replaceWith(container);
    var hiddenVal = $("<input type='hidden' id='" + field.attr("id") + "HiddenSelectedKey' name='" + ((field.attr("name")) ? field.attr("name") : field.attr("id")) + "-KeyVal' class='" + parameters.classesPrefix + "HiddenSelectedKey'></div>");
    container.append(hiddenVal);


    if (parameters.dataSources[parameters.activeDataSource].type==="static" || parameters.minInput === 0) {
        updateListContent(parameters);
    }

    //chaining  
    if (parameters.chained && parameters.chained.length>0) {
        $(parameters.chained).each(function(){
            initializeAC($(this).get(0));
        });
        
    }

    container.css("position","relative");
    if(!parameters.disableStatusIcon){
        var statusIcon = $("<span class='" + parameters.statusIcons.normal.classes + parameters.classesPrefix + " statusIconAC "+ parameters.addedClasses.statusIcon +"'></span>");

        switch(parameters.statusIconPosition){
            case "right":

                container.css({
                    position:"relative",
//                    "padding-right":"45px"
                });
                
                statusIcon.css({
                    display: "inline-block",
//                    position: "absolute",
                    float:"right" //: "15px"
                });
                
                break;
            case "left":

                container.css({
                    position:"relative",
//                    "padding-left":"45px"
                });
                
                statusIcon.css({
                    display: "inline-block",
//                    position: "absolute",
                    float:"left"//: "15px"
                });
                
                break;    

        }
        statusIcon.click(function(){
            if(list.is(":visible")){
                closeList(parameters);
                setStatusIcon(parameters,"normal");
            }else{
                openList(parameters);
                setStatusIcon(parameters,"opened");
                newField.focus();
            }
        });
        container.prepend(statusIcon);
        setStatusIcon(parameters,"normal");
        
        
        if($.isFunction(parameters.onInitEnd))parameters.onInitEnd();
    }
    
    
    if(parameters["startingSelectedVal"] || parameters["disableEmptySelection"]){
        var modifiedParams = $.extend(true, {}, parameters);
        modifiedParams["DISABLEDonSelectionChange"] = modifiedParams["onSelectionChange"];
        modifiedParams["onSelectionChange"] = null;
        autocompleteByKey(modifiedParams,modifiedParams["startingSelectedVal"]);
    }    
    
    return parameters;
}

function openList(parameters){
    var list = $("#"+parameters.fieldId+"AC");
    switch(parameters.animations.listOpen){
        case "none": 
            //Known bug : se non ci sono animazioni, il blur occorre prima del click. quindi aspetto un secondo per animarle per non far sparire l'elemento cliccato.
            setTimeout(function(){list.show();},200);    
            break;
        case "fade": 
            list.fadeIn(500);
            break;
    }
    
    $("#"+parameters.fieldId+"containerAC").addClass("openedList");
}

function closeList(parameters){
    var list = $("#"+parameters.fieldId+"AC");
    switch(parameters.animations.listOpen){
        case "none": 
            //Known bug : se non ci sono animazioni, il blur occorre prima del click. quindi aspetto un secondo per animarle per non far sparire l'elemento cliccato.
            setTimeout(function(){list.hide();},200);
            break;
        case "fade": 
            list.fadeOut(500);
            break;
    }  
    
    $("#"+parameters.fieldId+"containerAC").removeClass("openedList");
}

function setStatusIcon(parameters,status){
    if(!parameters.disableStatusIcon && parameters.statusIcons[status]){
        
        var container = $("#" + parameters.fieldId + "ContainerAC");
        var statusIcon = container.find(".statusIconAC").first();
        
        //cambio classi, cursor e content
        statusIcon.html(parameters.statusIcons[status].content);
        statusIcon.attr("class","");
        statusIcon.addClass("statusIconAC "+parameters.statusIcons[status].classes);
        statusIcon.css("cursor",parameters.statusIcons[status].cursor);
        
        if(parameters.statusIconPosition && parameters.statusIconPosition!=="manual"){
            var finalTop = container.height()/2-statusIcon.height()/2;

            if(finalTop<=0)finalTop = 20;

            statusIcon.css({"top":finalTop+"px"});
        }
    }
}

function resetAC(parameters){
    
    $("#"+parameters.fieldId+"ComplexModelPreview").html("").hide();
    $("#"+parameters.fieldId+"HiddenSelectedKey").val("");
    if(parameters.dataSources[parameters.activeDataSource].type !== "static"){
        $("#"+parameters.fieldId+"AC").html("").hide();
    }else{
        $("#"+parameters.fieldId+"AC").find("li.selected").removeClass("selected").show();
    }
    
    if ($.isFunction(parameters.onSelectionChange)){
        parameters.onSelectionChange();
    }
    
    if (parameters.chained) {
        $(parameters.chained).each(function(i,c){
            c.chainerValue=null; // ogni reset resetta i chainer dei figli e non i propri : potrei chiamare una reset anche non in catena.
            resetAC(c);
        });
    }
    
    $("#"+parameters.fieldId).show().val("");
    setStatusIcon(parameters,"normal");
}

function getSelectedElement(parameters){
    var currId = $("#" + parameters.fieldId + "HiddenSelectedKey").val();
    if(currId==="" || currId!==0 && !currId){
        return null;
    }
    
    return $("#" + parameters.fieldId + "AC ." + parameters.classesPrefix + "ACElement[ac-value="+currId+"]");
}

function getSelectedVal(parameters){
    return $("#" + parameters.fieldId + "HiddenSelectedKey").val();
}
