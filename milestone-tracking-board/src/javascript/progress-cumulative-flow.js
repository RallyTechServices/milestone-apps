(function(){
    var Ext = window.Ext4 || window.Ext;

    Ext.define("MilestoneTrackingApp.CumulativeFlowChart", {
        alias: "widget.statsbannercumulativeflowchart",
        extend: "Ext.Container",
        requires: [ 'Rally.ui.chart.Chart' ],
        mixins: [
            "MilestoneTrackingApp.IterationProgressMixin",
            "MilestoneTrackingApp.IterationProgressChart"
        ],
        cls: 'rally-iteration-progress-cumulative-flow-chart',
        currentScope: undefined,
        context: undefined,
        height: undefined,
        width: undefined,
        displayTitle: 'Cumulative Flow',
        minimalMode: false,
        initComponent: function() {
            this.callParent(arguments);

            var chartConfig = {
                storeType: 'Rally.data.lookback.SnapshotStore',
                storeConfig: this._getStoreConfig(),
                calculatorType: 'MilestoneTrackingApp.CFDCalculator',
                calculatorConfig: {
                    stateFieldName: 'ScheduleState',
                    stateFieldValues: this.scheduleStates
                }
            };
            chartConfig = this.minimalMode ? this._createMinimalConfig(chartConfig) : this._createChartConfig(chartConfig);
            this.add(chartConfig);

        },
        _getStoreConfig: function(){
            var oids = [];

            Ext.Array.each(this.store.getRange(), function(r){
                var children = r.get('DirectChildrenCount') || 0;
                if (children === 0 || r.get('_type') === 'defect'){
                    oids.push(r.get("ObjectID"));
                }
            });

            return {
                find: {
                    ObjectID: {$in: oids}
                },
                fetch: ['ScheduleState'],
                hydrate: ['ScheduleState'],
                sort: {
                    _ValidFrom: 1
                },
                context: this.context.getDataContext(),
                limit: Infinity
            };
        },
        _createMinimalConfig: function(overrides){
            var config = this._createChartConfig(overrides);
            delete config.chartConfig.xAxis;
            delete config.chartConfig.yAxis;

            return Ext.Object.merge(config, {
                chartConfig: {
                    tooltip: {
                        formatter: function() {
                            return false;
                        }
                    },
                    legend: { enabled: false },
                    xAxis: {
                        labels: { enabled: false },
                        tickPositions: []
                    },
                    yAxis: [{
                        title: {
                            text: null
                        },
                        min: 0,
                        labels: { enabled: false }
                    }],
                    title: { text: null }
                }
            });
        },

        _createChartConfig: function(overrides) {
            var clickChartHandler = _.isFunction(this.clickHandler) ? this.clickHandler : Ext.emptyFn;


            return Ext.Object.merge({
                xtype: 'rallychart',
                //updateAfterRender: Ext.bind(this._onLoad, this),

                chartColors: [  // RGB values obtained from here: http://ux-blog.rallydev.com/?cat=23
                    "#C0C0C0",  // $grey4
                    "#FF8200",  // $orange
                    "#F6A900",  // $gold
                    "#FAD200",  // $yellow
                    "#CADDA3",  // $lime
                    "#1E7C00"
                ],
                chartConfig: {
                    chart: {

                        //zoomType: 'xy',
                        height: this.height,
                        width: this.width,
                        spacingTop: 2,
                        spacingRight: 0,
                        spacingBottom: 8,
                        spacingLeft: 0,
                        alignTicks: false,
                        animation: true,
                        type: "area",
                        events: {
                            click: clickChartHandler
                        }
                    },
                    plotOptions: {
                        series: {
                            animation: true,
                            marker: {
                                enabled: false,
                                states: {
                                    hover: {
                                        enabled: false
                                    }
                                }
                            }
                        },
                        area: {
                            point: {
                                events: {
                                    click: clickChartHandler
                                }
                            },
                            stacking: 'normal'
                        }
                    },
                    legend: {
                        enabled: true
                    },
                    title: {text: null},
                    xAxis: {
                        tickmarkPlacement: 'on',
                        labels: {
                            formatter: function(){
                                return Rally.util.DateTime.format(new Date(this.value), 'MMM-dd');
                            },
                            rotation: 75
                        },
                        tickPositioner: function () {
                            var positions = [],
                                tick = Math.floor(this.dataMin),
                                increment = Math.ceil((this.dataMax - this.dataMin) / 10);

                            if (this.dataMax !== null && this.dataMin !== null) {
                                for (tick; tick - increment <= this.dataMax; tick += increment) {
                                    positions.push(tick);
                                }
                            }
                            return positions;
                        }
                    },
                    yAxis: [{
                        title: {text: null},
                        min: 0,
                        labels: {
                            style: {color: "#005eb8"}
                        }
                    }]
                }
            }, overrides || {});
        }
    });

})();