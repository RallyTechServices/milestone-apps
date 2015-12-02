(function() {
    var Ext = window.Ext4 || window.Ext;

    /**
     * @private
     * Rally.ui.grid.feature.SummaryRow
     *
     * Creates summary row below grid headers and before grid body (modified from Ext.grid.feature.SummaryView)
     *
     */

    Ext.define('Rally.ui.grid.feature.SummaryRow', {
        extend: 'Ext.grid.feature.AbstractSummary',
        alias: 'feature.summaryrow',

        dockedSummaryCls: Ext.baseCSSPrefix + 'docked-summary',
        panelBodyCls: Ext.baseCSSPrefix + 'summary-',
        scrollPadProperty: 'padding-right',
        dock: 'top',

        init: function(grid) {
            var me = this;
            this.grid = grid;

            this.callParent(arguments);

            grid.headerCt.on({
                afterlayout: this.updateSummaryRow,
                scope: this
            });

            // Stretch the innerCt of the summary bar upon headerCt layout
            grid.headerCt.afterComponentLayout = Ext.Function.createSequence(grid.headerCt.afterComponentLayout, function() {
                var width = this.getFullWidth(),
                    innerCt = me.summaryBar.innerCt,
                    scrollWidth;

                if (grid.getView().hasVerticalScroll()) {
                    scrollWidth = Ext.getScrollbarSize().width;
                    width -= scrollWidth;
                    innerCt.down('table').setStyle(me.scrollPadProperty, scrollWidth + 'px');
                }
                innerCt.setWidth(width);
            });

            grid.on({
                beforerender: {
                    fn: this._onGridBeforeRender,
                    single: true
                },
                afterrender: {
                    fn: this._onGridAfterRender,
                    single: true
                },
                afterproxyload: {
                    fn: this._afterProxyLoad,
                    single: true
                },
                scope: this
            });

            grid.mon(grid.store, 'beforeload', this._onStoreBeforeLoad, this);

        },

        updateSummaryRow: function() {
            var view = this.grid.getView(),
                record = this._createSummaryRecord(view),
                newRowDom = view.createRowElement(record, -1),
                oldRowDom, partner,
                p;

            if (!view.rendered) {
                return;
            }

            oldRowDom = this.summaryBar.el.down('.' + this.summaryRowCls, true);
            console.log('oldRowDom',oldRowDom);
            if (oldRowDom) {
                p = oldRowDom.parentNode;
                p.insertBefore(newRowDom, oldRowDom);
                p.removeChild(oldRowDom);

                partner = this.lockingPartner;
                // For locking grids...
                // Update summary on other side (unless we have been called from the other side)
                if (partner && partner.grid.rendered && !this.calledFromLockingPartner) {
                    partner.calledFromLockingPartner = true;
                    partner.updateSummaryRow();
                    partner.calledFromLockingPartner = false;
                }
            }
            this._onColumnHeaderLayout();
        },

        getSummary: function(store, type, field) {
            var data = store.getData(),
                sum=0;

            _.each(data.items, function(i){
                var val = i.data[field];
                if (val){
                    sum += val || 0;
                }
            });
            return sum;
        },

        _afterProxyLoad: function() {
            this._resumeRequestsForSummaryRowData();
            this.updateSummaryRow();

            this.grid.store.on('insert', function(store, record){this._onStoreInsertUpdateOrRemove(store, record, 'insert');}, this);
            this.grid.store.on('update', function(store, record){this._onStoreInsertUpdateOrRemove(store, record, 'update');}, this);
            this.grid.store.on('remove', function(store, record){this._onStoreInsertUpdateOrRemove(store, record, 'remove');}, this);

            this.grid.on('storebeforefilter', this._onStoreBeforeFilter, this);
            this.grid.on('storeafterbusupdate', this._onAfterBusUpdate, this);
            this.grid.on('pagingtoolbarbeforechange', this._onPagingToolbarBeforeChange, this);
        },

        _isChildNodeWithSummaryColumnChange: function(record, column, checkRecordModified){
            var isChildNodeWithThisColumnUpdate = false;

            if (!this.grid.store.isRootNode(record)) {
                var typeMappings = record.getArtifactMappings();
                if (typeMappings) {
                    _.each(typeMappings, function(value, key) {
                        if (value === column) {
                            var hasUpdate = checkRecordModified ? record.isModified(key) : this._isNodeWithSummaryColumnChange(record, key, false);
                            if (hasUpdate) {
                                isChildNodeWithThisColumnUpdate = true;
                                return false;
                            }
                        }
                    }, this);
                }
            }

            return isChildNodeWithThisColumnUpdate;
        },

        _isNodeWithSummaryColumnChange: function(record, column, checkRecordModified) {
            if (checkRecordModified) {
                return record.isModified(column);
            } else {
                return _.isNumber(record.get(column)) && record.get(column) > 0;
            }
        },

        _onStoreInsertUpdateOrRemove: function(store, record, action){
            var actionMappings = {
                insert: {
                    event: 'storeafterbuscreate',
                    checkRecordModified: false
                },
                update: {
                    event: 'storeafterbusupdate',
                    checkRecordModified: true
                },
                remove: {
                    event: 'storeafterbusremove',
                    checkRecordModified: false
                }
            };

            _.each(this.grid.summaryColumns, function(column){
                if (this._isNodeWithSummaryColumnChange(record, column.field, actionMappings[action].checkRecordModified) ||
                    this._isChildNodeWithSummaryColumnChange(record, column.field, actionMappings[action].checkRecordModified)) {
                    this.grid.on(actionMappings[action].event, this._onStoreDataChanged, this, {single: true});
                    return false;
                }
            }, this);
        },

        _onStoreBeforeFilter: function() {
            this.grid.on('afterproxyload', this.updateSummaryRow, this, {single: true});
        },

        _isNotTreeGridEditor: function(cmp) {
            return cmp && cmp.cmp && cmp.cmp.id !== this.grid.id;
        },

        _isOldEditor: function(cmp) {
            return _.isEmpty(cmp);
        },

        _onAfterBusUpdate: function(store, records, associatedRecords, cmp) {
            if (this._isOldEditor(cmp) || this._isNotTreeGridEditor(cmp)) {
                this._onStoreDataChanged();
            }
        },

        _onPagingToolbarBeforeChange: function() {
            this._suspendRequestsForSummaryRowData();
            this.grid.on('afterproxyload', this._resumeRequestsForSummaryRowData, this, {single: true});
        },

        _resumeRequestsForSummaryRowData: function() {
            this._shouldUpdateSummaryRow = true;
        },

        _suspendRequestsForSummaryRowData: function() {
            this._shouldUpdateSummaryRow = false;
        },

        _onStoreBeforeLoad: function(store, operation) {
            if (store.isRootNode(operation.node)) {
                this._loadOperation = operation;
            }
        },

        _onGridBeforeRender: function() {
            var view = this.grid.getView();

            var tableCls = [this.summaryTableCls];
            if (view.columnLines) {
                tableCls[tableCls.length] = view.ownerCt.colLinesCls;
            }
            this.summaryBar = this.grid.addDocked({
                childEls: ['innerCt'],
                renderTpl: [
                    '<div id="{id}-innerCt" role="presentation">',
                    '<table cellPadding="0" cellSpacing="0" class="' + tableCls.join(' ') + '">',
                    '<tr class="' + this.summaryRowCls + '"></tr>',
                    '</table>',
                    '</div>'
                ],
                style: 'overflow:hidden',
                itemId: 'summaryBar',
                cls: [ this.dockedSummaryCls, this.dockedSummaryCls + '-' + this.dock ],
                xtype: 'component',
                dock: this.dock,
                weight: 10000000
            })[0];
        },

        _onGridAfterRender: function() {
            var view = this.grid.getView();
            this.grid.body.addCls(this.panelBodyCls + this.dock);
            view.mon(view.el, {
                scroll: this._onViewScroll,
                scope: this
            });
        },

        _onStoreDataChanged: function() {
            if (this._loadOperation) {
                if (this._shouldUpdateSummaryRow) {
                    var readOperation = Ext.create('Ext.data.Operation', {
                        action: 'read',
                        params: Ext.clone(this._loadOperation.params)
                    });

                    readOperation.params.pagesize = 1;
                    readOperation.params.start = 1;
                    this.grid.store.getProxy().read(readOperation, this._afterProxyRead, this);
                } else {
                    this._resumeRequestsForSummaryRowData();
                }
            }
        },

        _afterProxyRead: function(op) {
            if (op.success && op.resultSet.sums) {
                this.grid.store.setSums(op.resultSet.sums);
                this.updateSummaryRow();
            }
        },

        _onViewScroll: function() {
            this.summaryBar.el.dom.scrollLeft = this.grid.getView().el.dom.scrollLeft;
        },

        _createSummaryRecord: function(view) {
            var columns = view.headerCt.getVisibleGridColumns(),
                summaryRecord = this.summaryRecord || (this.summaryRecord = Ext.create(this.grid.store.model, view.id + '-summary-record'));

            summaryRecord.beginEdit();

            _.each(columns, function(column){
                // In summary records, if there's no dataIndex, then the value in regular rows must come from a renderer.
                // We set the data value in using the column ID.
                if (!column.dataIndex) {
                    column.dataIndex = column.id;
                }

                summaryRecord.set(column.dataIndex, this.getSummary(this.grid.store, column.summaryType, column.dataIndex));
            }, this);

            summaryRecord.endEdit(true);
            summaryRecord.commit(true); // It's not dirty
            summaryRecord.isSummary = true;

            return summaryRecord;
        },

        // Synchronize column widths in the docked summary Component
        _onColumnHeaderLayout: function() {
            var view = this.grid.getView(),
                columns = view.headerCt.getVisibleGridColumns(),
                summaryEl = this.summaryBar.el,
                el;

            _.each(columns, function(column){
                el = summaryEl.down(view.getCellSelector(column));
                if (el) {
                    if (column.hidden) {
                        el.setDisplayed(false);
                    } else {
                        el.setDisplayed(true);
                        el.setWidth(column.width || (column.lastBox ? column.lastBox.width : 100));
                    }
                }
            }, this);
        }
    });
})();