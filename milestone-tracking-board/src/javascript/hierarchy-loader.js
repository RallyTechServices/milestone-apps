Ext.define('Rally.technicalservices.HierarchyLoader',{
    logger: new Rally.technicalservices.Logger(),

    storyModelName: 'hierarchicalrequirement',
    taskModelName: 'task',
    testCaseModelName: 'testcase',
    defectModelName: 'defect',

    mixins: {
        observable: 'Ext.util.Observable'
    },

    model: undefined,
    filters: undefined,
    fetch: undefined,
    childModels: undefined,

    maxParallelCalls: 6,

    constructor: function (config) {
        this.mixins.observable.constructor.call(this, config);
        this.portfolioItemTypes = config.portfolioItemTypes || [];
        this.models = config.models || null;
        this.fetch = config.fetch || [];
        this.filters = config.filters || [];
        this.loadChildModels = config.loadChildModels || [];
        
        if (! Ext.isArray(this.models) ) { this.models = [this.models]; }
    },
    load: function(){

        if (!this.models || this.models.length === 0){
            this.fireEvent('hierarchyloaderror', "No models specified.");
            return;
        }
        if (this.portfolioItemTypes.length === 0){
            this.fireEvent('hierarchyloaderror', "Portfolio Item Types not initialized.");
            return;
        }
        if (!(this.loadChildModels instanceof Array)){
            this.fireEvent('hierarchyloaderror', "No child models specified.");
            return;
        }

        var fns = [];
        for (var i = 0; i< this.loadChildModels.length + 2; i++){
            fns.push(this.fetchNextLevel);
        }

        Deft.Chain.pipeline(fns, this).then({
            success: function(){
                this.fireEvent('hierarchyloadcomplete');
            },
            failure: function(msg){
                this.fireEvent('hierarchyloaderror', msg);
            },
            scope: this
        });
    },
    fetchNextLevel: function(args){
        this.logger.log('fetchNextLevel', args, args && args.length);

        var me = this;
        
        if (!args){
            return this.fetchRoot();
        }

        args = _.flatten(args);
        this.logger.log('fetchNextLevel flattened args', args, args.length);
        
        var parents_by_type = {};
        Ext.Array.each(args, function(parent){
            if ( Ext.isFunction(parent.get) ) {
                var type = parent.get('_type');
                if ( Ext.isEmpty(parents_by_type[type]) ) {
                    parents_by_type[type] = [];
                }
                
                parents_by_type[type].push(parent);
            }
        });
        
        if (Ext.Object.getKeys(parents_by_type).length >  0) {
            
            var promises = [];
            Ext.Object.each(parents_by_type, function(type,parents) {
                me.fireEvent('hierarchyloadartifactsloaded', type, args);
    
                var portfolioItemTypePaths = _.pluck(me.portfolioItemTypes, 'typePath'),
                    portfolioItemOrdinal = _.indexOf(portfolioItemTypePaths, type);
    
                me.logger.log(' -- ', portfolioItemOrdinal, type);
                
                if (portfolioItemOrdinal === 0 && Ext.Array.contains(me.loadChildModels, me.storyModelName)) {
                    promises.push( function() { return me.fetchUserStories(args); });
                }
                if (portfolioItemOrdinal > 0 && Ext.Array.contains(me.loadChildModels, portfolioItemTypePaths[portfolioItemOrdinal - 1])) {
                    promises.push( function() { return me.fetchPortfolioItems(portfolioItemTypePaths[portfolioItemOrdinal - 1], args); });
                }
                
                var child_promises = [];
                
                if (type === me.storyModelName && Ext.Array.contains(me.loadChildModels, me.taskModelName)){
                    child_promises.push(function() { return me.fetchTasks(args) } );
                }
                
                if (type === me.storyModelName && Ext.Array.contains(me.loadChildModels, me.defectModelName)){
                    child_promises.push(function() { return me.fetchChildDefects(args) });
                }
                
                if (type === me.storyModelName && Ext.Array.contains(me.loadChildModels, me.testCaseModelName)){
                    child_promises.push(function() { return me.fetchTestCases(args) } );
                }
                if ( child_promises.length > 0 ) {
                    promises.push( function() { return Deft.Chain.sequence(child_promises); });
                }
            });
            
            if ( promises.length === 0 ) { return Promise.resolve([]); }
            
            return Deft.Chain.sequence(promises);
        }
        return Promise.resolve([]);
    },

    fetchRoot: function(){
        console.log('fetchRoot', this.models);
        var me = this;
        
        var config = {
            filters: this.filters
        };
        
        var promises = [];
        Ext.Array.each(this.models, function(model) {
            var fetch = me.fetch.concat(me.getRequiredFetchFields(model));
            var model_config = Ext.clone(config);
            model_config.model = model;
            model_config.fetch = fetch;
            promises.push(function() { return me.fetchWsapiRecords(model_config); });
        });
        
        this.fireEvent('statusupdate', "Loading artifacts");
        
        return Deft.Chain.sequence(promises);
    },
    fetchPortfolioItems: function(type, parentRecords){

        var fetch = this.fetch.concat(this.getRequiredFetchFields(type)),
            chunks = this._getChunks(parentRecords, 'Children', 'Count');

        return this.fetchChunks(type, fetch, chunks, "Parent.ObjectID", Ext.String.format("Please Wait... Loading Children for {0} Portfolio Items", parentRecords.length));
    },
    
    _getChunks: function(parentRecords, countField, countFieldAttribute){
        var chunks = [],
            childCount = 0,
            maxListSize = 25,
            childCountTarget = 200,
            idx = 0;

        chunks[idx] = [];
        _.each(parentRecords, function(r){
            if ( !Ext.isFunction(r.get) ) { return; }
            
            var count = r.get(countField);
            if (countFieldAttribute && count){
                count = count[countFieldAttribute];
            }
            if (count > 0){  //using story count because it is a more accurate gauge of the number of user stories for a feature than UserStories.Count is, evne though it may not match exactly.
                childCount += count;
                if (childCount > childCountTarget || chunks[idx].length >= maxListSize){
                    idx++;
                    chunks[idx] = [];
                    childCount = 0;
                }
                chunks[idx].push(r.get('ObjectID'));
            }
        });

        return chunks;
    },
    fetchUserStories: function(parentRecords){
        this.logger.log('fetchUserStories');
        
        var type = this.storyModelName,
            fetch = this.fetch.concat(this.getRequiredFetchFields(type)),
            chunks = this._getChunks(parentRecords, 'LeafStoryCount'),
            featureParentName = this.portfolioItemTypes[0].name.replace(/\s/g, '') + ".ObjectID";

        return this.fetchChunks(type, fetch, chunks, featureParentName, Ext.String.format("Please Wait... Loading User Stories for {0} Portfolio Items", parentRecords.length));
    },
    fetchTasks: function(parentRecords){
        var type = this.taskModelName,
            fetch = this.fetch.concat(this.getRequiredFetchFields(type)),
            chunks = this._getChunks(parentRecords, 'Tasks', 'Count');

        return this.fetchChunks(type, fetch, chunks, "WorkProduct.ObjectID", Ext.String.format("Please Wait... Loading Tasks for {0} User Stories", parentRecords.length));
    },
    fetchTestCases: function(parentRecords){
        var type = this.testCaseModelName,
            fetch = this.fetch.concat(this.getRequiredFetchFields(type)),
            chunks = this._getChunks(parentRecords, 'TestCases', 'Count');

        return this.fetchChunks(type, fetch, chunks, "WorkProduct.ObjectID", Ext.String.format("Please Wait... Loading {0} for {1} User Stories", type, parentRecords.length));
    },
    fetchChildDefects: function(parentRecords){
        var type = this.defectModelName,
            fetch = this.fetch.concat(this.getRequiredFetchFields(type)),
            chunks = this._getChunks(parentRecords, 'Defects', 'Count');

        return this.fetchChunks(type, fetch, chunks, "Requirement.ObjectID", Ext.String.format("Please Wait... Loading {0} for {1} User Stories", type, parentRecords.length));
    },
    
    fetchChunks: function(type, fetch, chunks, chunkProperty, statusString){
        this.logger.log('fetchChunks',fetch,  chunkProperty, chunks);

        if (chunks && chunks.length > 0 && chunks[0].length===0){
            return Promise.resolve([]);
        }

        this.fireEvent('statusupdate', statusString);

        var promises = [];
        _.each(chunks, function(c){
            var filters = _.map(c, function(ids){ return {property: chunkProperty, value: ids }; }),
                config = {
                    model: type,
                    fetch: fetch,
                    filters: Rally.data.wsapi.Filter.or(filters)
                };
            promises.push(function(){ return this.fetchWsapiRecords(config); });
        });

        return this.throttle(promises, this.maxParallelCalls, this);
    },
    fetchWsapiRecords: function(config){
        var deferred = Ext.create('Deft.Deferred');

        Ext.create('Rally.data.wsapi.Store',{
                model: config.model,
                fetch: config.fetch,
                filters: config.filters,
                compact: false,
                limit: 'Infinity'
            }).load({
                callback: function(records, operation){
                    if (operation.wasSuccessful()){
                        var fids = _.map(records, function(r){
                            return r.get('FormattedID')
                        });
                        deferred.resolve(records);
                    } else {
                        deferred.reject('fetchWsapiRecords error: ' + operation.error.errors.join(','));
                    }
                },
                scope: this
        });
        return deferred;
    },
    getRequiredFetchFields: function(type){
        if (/^portfolioitem/.test(type.toLowerCase())){
            return ['Children', 'LeafStoryCount','Parent','ObjectID'];
        }

        if (type.toLowerCase() === this.storyModelName){
            return ['FormattedID','Children','Tasks','Parent','PortfolioItem','HasParent','ObjectID','TestCases','Defects'];
        }

        if (type.toLowerCase() === this.taskModelName){
            return ['WorkProduct','ObjectID'];
        }
        
        if (type.toLowerCase() === this.defectModelName){
            return ['Requirement','ObjectID'];
        }
        
        if (type.toLowerCase() === this.testCaseModelName){
            return ['WorkProduct','ObjectID'];
        }
        return [];
    },
    throttle: function (fns, maxParallelCalls, scope) {

        if (maxParallelCalls <= 0 || fns.length < maxParallelCalls){
            return Deft.promise.Chain.parallel(fns, scope);
        }


        var parallelFns = [],
            fnChunks = [],
            idx = -1;

        for (var i = 0; i < fns.length; i++) {
            if (i % maxParallelCalls === 0) {
                idx++;
                fnChunks[idx] = [];
            }
            fnChunks[idx].push(fns[i]);
        }

        _.each(fnChunks, function (chunk) {
            parallelFns.push(function () {
                return Deft.promise.Chain.parallel(chunk, scope);
            });
        });

        return Deft.Promise.reduce(parallelFns, function(groupResults, fnGroup) {
            return Deft.Promise.when(fnGroup.call(scope)).then(function(results) {
                groupResults = groupResults.concat(results || []);
                return groupResults;
            });
        }, []);
    }

});