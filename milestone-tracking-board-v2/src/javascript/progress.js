//(function() {
//    var Ext = window.Ext4 || window.Ext;
//
//    /**
//     * shows burndown for timebox
//     */
//    Ext.define('MilestoneTrackingApp.MilestoneProgress', {
//        extend: 'MilestoneTrackingApp.BannerWidget',
//        alias:'widget.statsbannermilestoneprogress',
//
//        config: {
//            context: null,
//            store: null
//        },
//
//        currentChartDisplayed: 0,
//
//        stateId: 'stats-banner-iteration-progress',
//        stateful: true,
//
//        clientMetrics: {
//            method: '_onChartClick',
//            description: 'opened IterationProgressDialog'
//        },
//
//        tpl: [
//            '<div class="expanded-widget">',
//            '<div class="stat-title"></div>',
//            '<div class="stat-metric">',
//            '<div class="stat-carousel"></div>',
//            '</div>',
//            '</div>',
//            '<div class="collapsed-widget">',
//            '<span class="metric-icon icon-pie"></span>',
//            '<div class="stat-title"></div>',
//            '</div>'
//        ],
//
//        constructor: function(config) {
//            this.stateId = Rally.environment.getContext().getScopedStateId(this.stateId);
//            this.callParent(arguments);
//        },
//
//        initComponent: function(){
//            this.mon(this.store, 'datachanged', this.onDataChanged, this);
//            this.callParent(arguments);
//
//        },
//
//        expand: function() {
//            this.callParent();
//            this.onDataChanged();
//        },
//
//        _onChartClick: function() {
//            //var currentIndex = this.carousel.getCurrentItemIndex();
//            Ext.create('MilestoneTrackingApp.IterationProgressDialog', {
//               // startingIndex: currentIndex,
//                store: this.store,
//                context: this.context,
//                timeboxRecord: this.timeboxRecord,
//                scheduleStates: this.scheduleStates,
//                height: 400
//            });
//        },
//
//        onDestroy: function () {
//            this.callParent(arguments);
//        },
//
//        onRender: function() {
//            this.callParent(arguments);
//            if (this._getTimebox()) {
//                this._addPlaceholder();
//            }
//        },
//        _getTimebox: function(){
//            return this.timeboxRecord || null;
//        },
//
//        onDataChanged: function() {
//
//            if(this.rendered) {
//                if (this._getTimebox()) {
//                    this.update();
//
//                    this.createCarousel();
//                } else {
//                    this._addPlaceholder();
//                }
//            }
//        },
//
//        createCarousel: function() {
//            var boundClickHandler = Ext.bind(this._onChartClick, this);
//
//            if (this.chart){
//                this.chart.destroy();
//            }
//
//            this.chart = Ext.create('MilestoneTrackingApp.CumulativeFlowChart',{
//                width: 150,
//                height: 60,
//                minimalMode: true,
//                itemId: 'cumulative-flow-chart',
//                timeboxRecord: this.timeboxRecord,
//                clickHandler: boundClickHandler,
//                minimalMode: true,
//                scheduleStates: this.scheduleStates,
//                context: this.context,
//                renderTo: this.getEl().down('.stat-carousel'),
//                store: this.store
//            });
//            this._updateTitle('Cumulative Flow');
//        },
//
//        _updateTitle: function(title){
//            _.each(this.getEl().query('.stat-title'), function(el){
//                Ext.fly(el).update(title);
//            }, this);
//        },
//
//        _addPlaceholder: function() {
//            this.update();
//
//            if (this.expanded) {
//                this.chart = Ext.create('Ext.Container', {
//                    renderTo: this.getEl().down('.stat-carousel'),
//                    html: 'no iteration data'
//                });
//            }
//        }
//    });
//})();