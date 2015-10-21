(function(){
    var Ext = window.Ext4 || window.Ext;

    Ext.define("Rally.apps.iterationtrackingboard.statsbanner.iterationprogresscharts.BurndownChart", {
        alias: "widget.statsbannerburndownchart",
        extend: "Ext.Container",
        requires: [
            'Rally.ui.chart.Chart'
        ],
        mixins: [
            "Rally.apps.iterationtrackingboard.statsbanner.iterationprogresscharts.IterationProgressMixin",
            "Rally.apps.iterationtrackingboard.statsbanner.iterationprogresscharts.IterationProgressChart"
        ],

        currentScope: undefined,
        context: undefined,
        height: undefined,
        width: undefined,
        displayTitle: 'Burndown',
        minimalMode: false,
        onChartDataLoaded: Ext.emptyFn,

        initComponent: function() {
            this.callParent(arguments);

            Ext.Ajax.request({
                url: '/slm/charts/itsc.sp',
                params: {
                    iterationOid: this.context.getTimeboxScope().getRecord().getId(),
                    cpoid: this.context.getProject().ObjectID
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
            this._createBurndownChartDatafromXML(xmlDoc);
        },

        _createChartConfig: function(overrides) {
            var clickChartHandler = _.isFunction(this.clickHandler) ? this.clickHandler : Ext.emptyFn;

            return Ext.Object.merge({
                xtype: 'rallychart',
                chartColors: ["#005eb8", "#666666", "#8dc63f" ],
                updateAfterRender: Ext.bind(this._onLoad, this),

                chartConfig: {
                    chart: {
                        height: this.height,
                        width: this.width,
                        spacingTop: 2,
                        spacingRight: 0,
                        spacingBottom: 8,
                        spacingLeft: 0,
                        zoomType: 'xy',
                        alignTicks: false,
                        animation: true,
                        events: {
                            click: clickChartHandler
                        }
                    },
                    plotOptions: {
                        series: {
                            animation: true,
                            shadow: false,
                            borderWidth: 0,
                            marker: {
                                enabled: false,
                                states: {
                                    hover: {
                                        enabled: false
                                    }
                                }
                            },
                            events: {
                                click: clickChartHandler
                            }
                        },
                        column: {
                            point: {
                                events: {
                                    click: clickChartHandler
                                }
                            }
                        }
                    },
                    legend: { enabled: true },
                    title: { text: null },
                    xAxis: {
                        tickmarkPlacement: 'on',
                        tickInterval: 1
                    },
                    yAxis: [
                        {
                            title: { text: null },
                            min: 0,
                            labels: { style: { color: "#005eb8" } }
                        },
                        {
                            title: { text: null },
                            min: 0,
                            opposite: true,
                            labels: { style: { color: "#8dc63f" } }
                        }
                    ]
                },
                chartData: {
                    categories: [],
                    series: [
                        {
                            name: "To Do",
                            type: "column",
                            data: [],
                            tooltip: { enabled: false }
                        },
                        {
                            name: "Ideal",
                            type: "line",
                            dashStyle: "Solid",
                            data: [],
                            marker : {
                                enabled : true,
                                radius : 3
                            },
                            tooltip: { enabled: false }
                        },
                        {
                            name: "Accepted",
                            type: "column",
                            data: [],
                            yAxis: 1,
                            tooltip: { enabled: false }
                        }
                    ]
                }
            }, overrides || {});
        },

        _createMinimalConfig: function(){
            var config = this._createChartConfig();
            delete config.chartConfig.xAxis;
            delete config.chartConfig.yAxis;
            delete config.chartData.series[1].marker;

            config = Ext.Object.merge(config, {
                chartConfig: {
                    chart: {
                        zoomType: ''
                    },
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

                    yAxis: [
                        {
                            title: { text: null },
                            min: 0,
                            labels: { enabled: false }
                        },
                        {
                            title: { text: null },
                            min: 0,
                            opposite: true,
                            labels: { enabled: false }
                        }
                    ],
                    title: { text: null }
                }
            });
            return config;
        },

        _createBurndownChartDatafromXML: function (xmlDoc) {

            this.chartComponentConfig = this.minimalMode ? this._createMinimalConfig() : this._createChartConfig();

            var xmlChartData = xmlDoc.getElementsByTagName("chart_data")[0];
            var xmlChartValueText = xmlDoc.getElementsByTagName("chart_value_text")[0];
            var draw = xmlDoc.getElementsByTagName("draw")[0];
            var axis_value = xmlDoc.getElementsByTagName("axis_value")[1];

            var rows = xmlChartData.getElementsByTagName("row");

            // this makes no sense...The thing labeled Accepted in the <chart_data> element, isn't.
            // The thing that is Accepted, is buried in the <chart_value_text> element

            this.chartComponentConfig.chartData.categories = this._getStringValues(rows[0].getElementsByTagName("string")); // categories
            this.chartComponentConfig.chartData.series[0].data = this._getNumberValues(rows[1].getElementsByTagName("number")); //todo;
            this.chartComponentConfig.chartData.series[1].data = this._getNumberValues(rows[3].getElementsByTagName("number")); //ideal;
            this.chartComponentConfig.chartData.series[2].data = this._getNumberValues(xmlChartValueText.getElementsByTagName("row")[2].getElementsByTagName("number")); //accepted;
            this.chartComponentConfig.chartConfig.yAxis[0].max = axis_value.getAttribute("max") * 1;

            var texts = draw.getElementsByTagName("text");
            // find the last <text element with orientation="vertical_down" attribute, that's the max y-axis 2 setting
            for (i = 0; i < texts.length; i++) {
                if (texts[i].getAttribute("orientation") === "vertical_down") {
                    this.chartComponentConfig.chartConfig.yAxis[1].max = (this._getElementValue(texts[i]) * 1);
                }
            }
            this._configureYAxisIntervals();

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