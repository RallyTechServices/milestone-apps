Ext.define('Rally.technicalservices.data.ChunkerStore',{
    MAX_CHUNK_SIZE: 25,
    logger: new Rally.technicalservices.Logger(),
    config: {
        model: null,
        fetch: null,
        chunkField: null,
        chunkOids: null
    },
    records: null,

    constructor: function(config){
        this.initConfig(config);
    },
    load: function(){
        var deferred = Ext.create('Deft.Deferred');
        var oids = this.chunkOids;
        var promises = [];

        if (oids.length > this.MAX_CHUNK_SIZE){
            var start_idx = 0;
            console.log('original array',oids);
            while(start_idx < oids.length){
                var chunk_values = oids.splice(start_idx, this.MAX_CHUNK_SIZE);
                promises.push(this._fetchRecords(chunk_values));
            }
        } else {
            promises.push(this._fetchRecords(oids));
        }

        if (promises.length == 0){
            deferred.resolve();
        }
        Deft.Promise.all(promises).then({
            scope: this,
            success: function(records) {
                var data = _.flatten(records);
                deferred.resolve(data);
            },
            failure: function(operation){
                deferred.resolve([]);
            }
        });
        return deferred;
    },
    _fetchRecords: function(object_ids){
        var deferred = Ext.create('Deft.Deferred');
        var filters = [];
        Ext.each(object_ids, function(oid){
            filters.push({property: this.chunkField, value: oid});
        },this);
        var wsFilters = Rally.data.wsapi.Filter.or(filters);

        Ext.create('Rally.data.wsapi.Store',{
            model: this.model,
            fetch: this.fetch,
            autoLoad: true,
            context: {project: null},
            filters: wsFilters
        }).load({
            callback: function(records, operation, success){
                this.logger.log('chunking success', success);
                if (success){
                    deferred.resolve(records);
                } else {
                    deferred.reject(operation);
                }

            },
            scope: this
        });
        return deferred;
    }
});
