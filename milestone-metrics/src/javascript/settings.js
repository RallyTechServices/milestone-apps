Ext.define('Rally.technicalservices.Settings',{
    singleton: true,
    getFields: function(){
        var fields = [];



        fields.push({
            name: 'closedDefectStates',
            xtype: 'rallyfieldvaluecombobox',
            width: 400,
            labelWidth: 150,
            labelAlign: 'right',
            multiSelect: true,
            fieldLabel: 'Inactive Defect States',
            emptyText : "Select Inactive States...",
            model: 'defect',
            field: 'State',
            listConfig : {
                getInnerTpl : function() {
                    return '<div class="x-combo-list-item"><img src="" class="chkCombo-default-icon chkCombo" /> {displayName} </div>';
                }
            }
        });

        return fields;
    }
});
