Ext.define('Rally.technicalservices.WsapiToolbox',{
   // logger: new Rally.technicalservices.Logger(),
    singleton: true,
    fetchLeafProjectsInScope: function(project_ref){
        var deferred = Ext.create('Deft.Deferred');

        Rally.technicalservices.WsapiToolbox.fetchProjectTree(project_ref).then({
            success: function(project_tree){
                var leaves = Rally.technicalservices.WsapiToolbox._getLeaves(project_tree);
                deferred.resolve(leaves);
            },
            failure: function(msg){
                deferred.reject(msg);
            }
        });

        return deferred;
    },
    _getAll: function(tree){
        var leaves = [];

        if (!Ext.isArray(tree)){
            tree = [tree];
        }
        _.each(tree, function(t){
            leaves.push(t);
            leaves = Ext.Array.merge(leaves, Rally.technicalservices.WsapiToolbox._getAll(t.get('Children')));

        });
        return leaves;
    },
    _getLeaves: function(tree){
        var leaves = [];

        if (!Ext.isArray(tree)){
            tree = [tree];
        }
        _.each(tree, function(t){
            if (t.get('Children').length == 0){
                leaves.push(t);
            } else {
                leaves = Ext.Array.merge(leaves, Rally.technicalservices.WsapiToolbox._getLeaves(t.get('Children')));
            }
        });
        return leaves;
    },
    fetchProjectTree: function(current_ref){
        var deferred = Ext.create('Deft.Deferred');

        var fetch = ['ObjectID','Name','Parent'];

        var store = Ext.create('Rally.data.wsapi.Store',{
            model: 'Project',
            fetch: fetch
        });

        store.load({
            scope: this,
            callback: function(records, operation, success){
                if (success){
                    var project_tree = Rally.technicalservices.WsapiToolbox._getTreeArray(records, current_ref);
                    deferred.resolve(project_tree);
                } else {
                    deferred.resolve('Error fetching projects: ' + operation.error.errors.join(','));
                }
            }
        });
        return deferred;
    },
    _getTreeArray:function(records, currentProjectRef) {

        var projectHash = {};
        _.each(records, function(rec){
            projectHash[rec.get('ObjectID')] = rec;
        });
        var current_root = null;

        var root_array = [];
        Ext.Object.each(projectHash, function(oid,item){

            if ( !item.get('Children') ) { item.set('Children',[]); }
            var direct_parent = item.get('Parent');
            if (!direct_parent && !Ext.Array.contains(root_array,item)) {
                root_array.push(item);
            } else {

                var parent_oid =  direct_parent.ObjectID || direct_parent.get('ObjectID');
                if (!projectHash[parent_oid]) {
                    if ( !Ext.Array.contains(root_array,item) ) {
                        root_array.push(item);
                    }
                } else {
                    var parent = projectHash[parent_oid];

                    if ( !parent.get('Children') ) { parent.set('Children',[]); }
                    var kids = parent.get('Children');
                    kids.push(item);
                    parent.set('Children',kids);
                }
            }
            var regex = new RegExp(item.get('_ref'));
            if (regex.test(currentProjectRef)){
                current_root = item;
            }

        },this);
        return current_root;
    },
    fetchScheduleStates: function(){
        var deferred = Ext.create('Deft.Deferred');
        Rally.data.ModelFactory.getModel({
            type: 'HierarchicalRequirement',
            success: function(model) {
                var field = model.getField('ScheduleState');
                field.getAllowedValueStore({sort: {property: 'Ordinal', direction: 'ASC'}}).load({
                    callback: function(records, operation, success) {
                        if (success){
                            var values = _.map(records, function(r){return r.get('StringValue')});
                            deferred.resolve(values);
                        } else {
                            deferred.reject('Error loading ScheduleState values for User Story:  ' + operation.error.errors.join(','));
                        }
                    },
                    scope: this
                });
            },
            failure: function() {
                var error = "Could not load schedule states";
                deferred.reject(error);
            }
        });
        return deferred.promise;
    },
    fetchDoneStates: function(){
        var deferred = Ext.create('Deft.Deferred');
        Rally.data.ModelFactory.getModel({
            type: 'HierarchicalRequirement',
            success: function(model) {
                var field = model.getField('ScheduleState');
                field.getAllowedValueStore().load({
                    callback: function(records, operation, success) {
                        if (success){
                            var values = [];
                            for (var i=records.length - 1; i > 0; i--){
                                values.push(records[i].get('StringValue'));
                                if (records[i].get('StringValue') == "Accepted"){
                                    i = 0;
                                }
                            }
                            deferred.resolve(values);
                        } else {
                            deferred.reject('Error loading ScheduleState values for User Story:  ' + operation.error.errors.join(','));
                        }
                    },
                    scope: this
                });
            },
            failure: function() {
                var error = "Could not load schedule states";
                deferred.reject(error);
            }
        });
        return deferred.promise;
    },

    fetchWsapiRecords: function(config){
        var deferred = Ext.create('Deft.Deferred');

        config.limit = config.limit || 'Infinity';
        config.pageSize = config.pageSize || 200;
        config.sort = config.sort || [{
                property: 'ObjectID',
                direction: 'DESC'
            }];
        config.filters = config.filters || [];

        Ext.create('Rally.data.wsapi.Store', config).load({
            scope: this,
            callback : function(records, operation, success) {
             //   this.logger.log('fetchWsapiRecords success-->', success, ' operation-->', operation, ' records', records)
                if (success){
                    deferred.resolve(records);
                } else {
                    deferred.reject(Ext.String.format('Error loading Store (Model = {0}, Fetch = {1}: {2}',config.model, config.fetch.join(','), operation.error.errors.join(',')));
                }
            }
        });
        return deferred.promise;
    },
    fetchPreferences: function(appId){
        var deferred = Ext.create('Deft.Deferred');

        if (appId){
            Rally.data.PreferenceManager.load({
                appID: appId,
                success: function(prefs) {
                    deferred.resolve(prefs);
                }
            });
        } else {
            deferred.resolve([]);
        }

        return deferred.promise;
    },
    fetchWsapiCount: function(model, query_filters){
        var deferred = Ext.create('Deft.Deferred');

        var store = Ext.create('Rally.data.wsapi.Store',{
            model: model,
            fetch: ['ObjectID'],
            filters: query_filters,
            limit: 1,
            pageSize: 1
        }).load({
            callback: function(records, operation, success){
                if (success){
                    deferred.resolve(operation.resultSet.totalRecords);
                } else {
                    deferred.reject(Ext.String.format("Error getting {0} count for {1}: {2}", model, query_filters.toString(), operation.error.errors.join(',')));
                }
            }
        });
        return deferred;
    }
});
