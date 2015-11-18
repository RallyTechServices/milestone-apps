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
        firstPortfolioItemName: 'Feature',

        config: {
            context: null,
            expanded: true,

        },

        items: [
            {xtype: 'statsbanneraccepted', byCount: false,  title: 'Accepted Points', unitLabel: "Points"},
            {xtype: 'statsbannerestimatedstories', title: "Estimated Work Items", unitLabel: "Work Items"},
            {xtype: 'statsbanneraccepted', byCount: true,  title: 'Accepted Count', unitLabel: "work items"},
            {xtype: 'statsbannerdefects', title: 'Active Defects', unitLabel: ' Defects'},
            {xtype: 'statsbannertestcases', title: 'Test Cases Passed', unitLabel: 'executed'},
            {xtype: 'statsbannermilestoneprogress', flex: 2},
            {xtype: 'statsbannercollapseexpand', flex: 0}
        ],

        constructor: function(config) {
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

            var filters = this._getBannerFilters();

            this.store = Ext.create('Rally.data.wsapi.artifact.Store', {
                models: ['HierarchicalRequirement','Defect'],
                fetch: ['ObjectID', 'FormattedID', 'ScheduleState', 'PlanEstimate','Iteration','Name','StartDate','EndDate','State','DirectChildrenCount'],
                filters: filters,
                context: this.context.getDataContext(),
                limit: Infinity
            });

            //need to configure the items at the instance level, not the class level (i.e. don't use the 'defaults' config)
            this.items = this._configureItems(this.items);

            this.on('expand', this._onExpand, this);
            this.on('collapse', this._onCollapse, this);
            this.store.on('load', this._checkForLateStories, this);
            this.callParent(arguments);
            this._update();

        },
        _checkForLateStories: function(store){
            var lateStories = 0,
                targetDate = Rally.util.DateTime.fromIsoString(this.timeboxRecord.get(this.timeboxEndDateField));

            _.each(this.store.getRange(), function(record){
                var iteration = record.get('Iteration'),
                    children = record.get('DirectChildrenCount') || 0;
                if (children === 0){
                    if (iteration){
                        if (Rally.util.DateTime.fromIsoString(iteration.EndDate) > targetDate){
                            lateStories++;
                        }
                    } else {
                        lateStories++;
                    }
                }

            }, this);
            if (lateStories > 0){
                this.fireEvent('latestoriesfound', lateStories);
            }
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
            console.log('_setExpandedOnChildItems', this.items)
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

        _configureItems: function(items) {
            console.log('_configureItems', this.scheduleStates)
            var defaults = {
                flex: 1,
                context: this.context,
                store: this.store,
                timeboxRecord: this.timeboxRecord,
                timeboxEndDateField: this.timeboxEndDateField,
                scheduleStates: this.scheduleStates,
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
        },
        _getBannerFilters: function(){
            var filters = Ext.create('Rally.data.wsapi.Filter',{
                property: 'Milestones',
                value: this.timeboxRecord.get('_ref')
            });
            filters = filters.or({
                property: 'Requirement.Milestones',
                value: this.timeboxRecord.get('_ref')
            });
            return filters;
        }
    });
})();