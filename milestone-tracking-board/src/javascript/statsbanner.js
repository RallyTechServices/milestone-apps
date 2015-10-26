(function() {
    var Ext = window.Ext4 || window.Ext;

    /**
     * Allows user to see stats for a timebox in a horizontal bar format
     */
    Ext.define('MilestoneTrackingApp.StatsBanner', {
        extend: 'Ext.container.Container',
        alias:'widget.statsbanner',
        mixins: [
            'Rally.Messageable',
            'Rally.clientmetrics.ClientMetricsRecordable'
        ],
        cls: 'stats-banner',
        layout: 'hbox',
        border: 0,
        width: '100%',
        stateful: true,
        stateEvents: ['expand', 'collapse'],
        filters: [],

        config: {
            context: null,
            expanded: true,

        },

        items: [
            {xtype: 'statsbanneraccepted', byCount: false,  title: 'Accepted Points', unitLabel: "Points"},
            {xtype: 'statsbannertimeboxend'},
            {xtype: 'statsbannerestimatedstories'},
            {xtype: 'statsbanneraccepted', byCount: true,  title: 'Accepted Count', unitLabel: "Count"},
            {xtype: 'statsbannerlatestories'},
            {xtype: 'statsbanneriterationprogress', flex: 2},
            {xtype: 'statsbannercollapseexpand', flex: 0}
        ],

        constructor: function() {
            //this.stateId = Rally.environment.getContext().getScopedStateId('stats-banner');
            console.log('arguments', arguments);
            this.totalUnitFilter = arguments[0].totalUnitFilter;
            this.calculatedUnitFilter = arguments[0].calculatedUnitFilter;

            this.callParent(arguments);
        },

        initComponent: function() {
            this.addEvents(
                /**
                 * @event
                 * Fires when expand is clicked
                 */
                'expand',
                /**
                 * @event
                 * Fires when collapse is clicked
                 */
                'collapse'
            );

            this.subscribe(this, Rally.Message.objectDestroy, this._update, this);
            this.subscribe(this, Rally.Message.objectCreate, this._update, this);
            this.subscribe(this, Rally.Message.objectUpdate, this._update, this);
            this.subscribe(this, Rally.Message.bulkUpdate, this._update, this);

            var fetch = this.storeConfig.fetch,
                filters = this.storeConfig.filters || [],
                model = this.storeConfig.model;

            this.store = Ext.create('Rally.data.wsapi.Store', {
                model: model,
                filters: filters,
                fetch: fetch,
                context: this.context.getDataContext(),
                limit: Infinity
            });

            //    Ext.create('Rally.data.wsapi.artifact.Store', {
            //    models: ['PortfolioItem/Feature'],
            //    fetch: [
            //        'Name',
            //        'PercentDoneByStoryCount', 'PercentDoneByStoryPlanEstimate',
            //        'Release[Name;ReleaseStartDate;ReleaseDate]',
            //        'PreliminaryEstimate[Value]',
            //        'LateChildCount',
            //        'AcceptedLeafStoryPlanEstimateTotal', 'AcceptedLeafStoryCount',
            //        'LeafStoryCount', 'LeafStoryPlanEstimateTotal', 'UnEstimatedLeafStoryCount',
            //        'PlannedStartDate', 'PlannedEndDate', 'ActualStartDate', 'ActualEndDate',
            //        'UserStories:summary[ScheduleState;PlanEstimate;ScheduleState+Blocked]'
            //    ],
            //    useShallowFetch: true,
            //    filters: this.filters,
            //    context: this.context.getDataContext(),
            //    limit: Infinity,
            //    requester: this
            //});

            //need to configure the items at the instance level, not the class level (i.e. don't use the 'defaults' config)
            this.items = this._configureItems(this.items);

            this.on('expand', this._onExpand, this);
            this.on('collapse', this._onCollapse, this);
            this.callParent(arguments);
            this._update();
        },

        onRender: function() {
            if (this.expanded) {
                this.removeCls('collapsed');
            } else {
                this.addCls('collapsed');
            }
            this._setExpandedOnChildItems();
            this.callParent(arguments);
        },

        applyState: function (state) {
            if (Ext.isDefined(state.expanded)) {
                this.setExpanded(state.expanded);
            }
            this._setExpandedOnChildItems();
        },

        getState: function(){
            return {
                expanded: this.expanded
            };
        },

        _setExpandedOnChildItems: function() {
            _.each(this.items.getRange(), function(item) {
                console.log('item',item)
                item.setExpanded(this.expanded);
            }, this);
        },

        _getItemDefaults: function() {
            return {
                flex: 1,
                context: this.context,
                store: this.store,
                listeners: {
                    ready: this._onReady,
                    scope: this
                }
            };
        },

        _onReady: function() {
            this._readyCount = (this._readyCount || 0) + 1;
            if(this._readyCount === this.items.getCount()) {
                this.recordComponentReady();
                delete this._readyCount;
            }
        },

        _onCollapse: function() {
            this.addCls('collapsed');
            this.setExpanded(false);

            _.invoke(this.items.getRange(), 'collapse');
        },

        _onExpand: function() {
            this.removeCls('collapsed');
            this.setExpanded(true);

            _.invoke(this.items.getRange(), 'expand');
        },

        _hasTimebox: function() {
            return true;
        },

        _configureItems: function(items, records) {
            var defaults = {
                flex: 1,
                context: this.context,
                store: this.store,
                timeboxRecord: this.timeboxRecord,
                timeboxEndDateField: this.timeboxEndDateField,
                listeners: {
                    ready: this._onReady,
                    scope: this
                }
            };

            return _.map(items, function(item) {
                return _.defaults(_.cloneDeep(item), defaults);
            });
        },

        _update: function () {
            if(this._hasTimebox()) {
                this.store.load();
            }
        }
    });
})();