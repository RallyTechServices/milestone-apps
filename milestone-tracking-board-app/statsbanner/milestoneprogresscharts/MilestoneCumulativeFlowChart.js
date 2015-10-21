(function(){
    var Ext = window.Ext4 || window.Ext;

    Ext.define("Rally.apps.iterationtrackingboard.statsbanner.iterationprogresscharts.CumulativeFlowChart", {
        alias: "widget.statsbannercumulativeflowchart",
        extend: "Ext.Container",
        requires: [ 'Rally.ui.chart.Chart' ],
        mixins: [
            "Rally.apps.iterationtrackingboard.statsbanner.iterationprogresscharts.IterationProgressMixin",
            "Rally.apps.iterationtrackingboard.statsbanner.iterationprogresscharts.IterationProgressChart"
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

            Ext.Ajax.request({
                url: '/slm/charts/icfc.sp',
                params: {
                    iterationOid: this.context.getTimeboxScope().getRecord().getId(),
                    cpoid: this.context.getProject().ObjectID,
                    bigChart: true
                },
                method: 'GET',
                withCredentials: true,
                success: function(response, request) {
                    this._loadData(response.responseText);
                },
                requester: this,
                scope: this
            });
        },

        _loadData: function(chartData) {
            var xmlDoc = this._createChartDatafromXML(chartData);
            this._createCumulativeFlowChartDatafromXML(xmlDoc);
        },

        _createMinimalConfig: function(){
            var config = this._createChartConfig();
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
                updateAfterRender: Ext.bind(this._onLoad, this),

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
                    title: { text: null },
                    xAxis: {
                        tickmarkPlacement: 'on',
                        tickInterval: 1
                    },
                    yAxis: [{
                        title: { text: null },
                        min: 0,
                        labels: {
                            style: { color: "#005eb8" }
                        }
                    }]
                },
                chartData: {
                    categories: [],
                    series: []
                }
            }, overrides || {});
        },

        _createCumulativeFlowChartDatafromXML: function (xmlDoc) {

            this.chartComponentConfig = this.minimalMode ? this._createMinimalConfig() : this._createChartConfig();

            var xmlChartData = xmlDoc.getElementsByTagName("chart_data")[0];

            var rows = xmlChartData.getElementsByTagName("row");
            var i, j;
            this.chartComponentConfig.chartData.categories = this._getStringValues(rows[0].getElementsByTagName("string")); // categories
            for(j=rows.length-1, i = 0 ; j > 0; j--,i++) {
                this.chartComponentConfig.chartData.series[i] = {};
                this.chartComponentConfig.chartData.series[i].data = this._getNumberValues(rows[j].getElementsByTagName("number"));
                this.chartComponentConfig.chartData.series[i].name = this._getStringValues(rows[j].getElementsByTagName("string"))[0];
            }

            // the 'max' y axis value in the xml isn't correct, so we'll calculate it ourselves...
            this.chartComponentConfig.chartConfig.yAxis[0].max = this._computeMaxYAxisValue(this.chartComponentConfig.chartData.series);

            this._configureYAxisIntervals();


            // Use number of ScheduleState values to show as a surrogate for with of the legend text.
            if(this.chartComponentConfig.chartData.series.length === 6) {
                this.chartComponentConfig.chartConfig.legend.itemStyle = { fontSize: '8px'};
            } else if(this.chartComponentConfig.chartData.series.length === 5) {
                this.chartComponentConfig.chartConfig.legend.itemStyle = { fontSize: '10px'};
            } // else it will default to 12px

            this.chartComponentConfig.chartConfig.xAxis.tickInterval = Math.floor(this.chartComponentConfig.chartData.series[0].data.length / 4);

            this.add(this.chartComponentConfig);
        },


        _onLoad: function() {
            this.fireEvent('contentupdated', this);
            this.fireEvent('ready', this);
            if (Rally.BrowserTest) {
                Rally.BrowserTest.publishComponentReady(this);
            }
        }
    });

})();