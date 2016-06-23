Ext.define('Rally.technicalservices.Settings',{
    singleton: true,
    getFields: function(){
        var fields = [];



        fields.push({ 
            name: 'storiesOnlyForAccepted',
            xtype: 'rallycheckboxfield',
            boxLabelAlign: 'after',
            fieldLabel: '',
            margin: '0 0 25 25',
            boxLabel: 'Stories Only<br/><span style="color:#999999;"><i>Tick to exclude defects, test cases, and defect suites from acceptance calculations</i></span>'
        },
        {
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
