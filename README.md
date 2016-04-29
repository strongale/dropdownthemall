# DropDownThemAll.js

A jquery library to handle everything about drop down selectors.

This library is still under construction. 
A beta version has been reached and I'm currently documenting the whole work.

The library do not use an hidden *select* tag in order to show substitutive control, but creates a new controls starting by a simple text input.

## What can I do with Drop down Them All
* Customize dropdowns appearence.
* Create autocompleting fields.
* Create Chained dropdowns.
* Combinate any set of the previous.



## Usage

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

