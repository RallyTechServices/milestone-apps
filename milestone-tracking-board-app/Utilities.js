Ext.define('Rally.technicalservices.Utilities',{
    singleton: true,
    fetchPortfolioTypes: function(){
        var deferred = Ext.create('Deft.Deferred');

        var typeStore = Ext.create('Rally.data.wsapi.Store', {
            autoLoad: false,
            model: 'TypeDefinition',
            sorters: [{
                property: 'Ordinal',
                direction: 'ASC'
            }],
            filters: [{
                property: 'Parent.Name',
                operator: '=',
                value: 'Portfolio Item'
            }, {
                property: 'Creatable',
                operator: '=',
                value: true
            }]
        });

        typeStore.load({
            scope: this,
            callback: function (records, operation, success) {
                if (success){
                    deferred.resolve(records);
                } else {
                    deferred.reject("Error loading Portfolio Item Types:  " + operation.error.errors.join(','));
                }

            }
        });
        return deferred;
    }
});