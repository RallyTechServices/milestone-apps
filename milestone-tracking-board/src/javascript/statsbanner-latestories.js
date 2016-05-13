(function() {
    var Ext = window.Ext4 || window.Ext;

    Ext.define('MilestoneTrackingApp.popover.LateStories', {
        alias: 'widget.latestoriespopover',
        extend: 'Rally.ui.popover.Popover',

        constructor: function (config) {
            config.items = [
                {
                    xtype: 'rallygrid',
                    model: 'User Story',
                    headerCls: 'leftright-header-text',
                    columnCfgs: ['FormattedID', 'Name', 'Feature', 'PlanEstimate', 'Iteration', 'Release', 'Project', 'Owner'],
                    pagingToolbarCfg: {
                        pageSizes: [5, 10, 15]
                    },
                    store: config.store
                }
            ];

            this.callParent(arguments);
        }
    });
    /**
     * shows defects active for timebox
     */
    Ext.define('MilestoneTrackingApp.LateStories', {
        extend: 'MilestoneTrackingApp.BannerWidget',
        alias:'widget.statsbannerlatestories',
        requires: [],

        config: {
            context: null,
            store: null,
            data: {
                activeCount: 0
            }
        },

        tpl: [
            '<div class="expanded-widget">',
            '<span style="cursor: pointer">',
            '<div class="stat-title">Late Stories</div>',
            '<div class="stat-metric">',
            '<div class="metric-icon icon-story"></div>{activeCount}',
            '<div class="stat-secondary">Late</div>',
            '</span>',
            '</div>',
            '</div>',
            '<div class="collapsed-widget">',
            '<span class="metric-icon icon-story"></span>',
            '<div class="stat-title">Late Stories</div>',
            '<div class="stat-metric">{activeCount}</div>',
            '</div>'
        ],

        initComponent: function() {
            this.mon(this.store, 'datachanged', this.onDataChanged, this);
            this.on('render', function () {
                this.getEl().on('click', function () {
                    this._onClickLateStories();
                }, this);
            }, this);
            this.callParent(arguments);
        },

        onDataChanged: function() {
            this.update(this._getRenderData());
            this.fireEvent('ready', this);
        },

        _getLateStoriesCount: function() {
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
            return lateStories;
        },

        _getRenderData: function() {
            return {activeCount: this._getLateStoriesCount()};
        }
    });
})();