Ext.define('Rally.technicalservices.Toolbox',{
    singleton: true,
    getSettingAsArray: function(setting){
        var setting_as_array = setting || [];
        if (!(setting_as_array instanceof Array)){
            setting_as_array = setting_as_array.split(',');
        }
        return setting_as_array;
    },
    populateTimeHash: function(startTime, endTime, granularity, key_format, records, date_field){
        var hash = Rally.technicalservices.Toolbox.initializeTimeHash(startTime, endTime,granularity,key_format);
         _.each(records, function(r){
             var date_value = r.get(date_field);

            if (date_value){
                if (date_value < startTime){
                    date_value = startTime;
                }
                var date_key = Rally.technicalservices.Toolbox.getTimeHashKey(date_value,key_format);
                if (hash[date_key]){
                    hash[date_key].push(r);
                }
            }
        });
        return hash;
    },
    getTimeCategories: function(startTime, endTime, granularity, key_format){
        if (isNaN(Date.parse(startTime)) || isNaN(Date.parse(endTime))){
            return [];
        }
        if (!Ext.Array.contains(['month','day'],granularity)){
            return [];
        }
        var diff = Rally.util.DateTime.getDifference(endTime, startTime, granularity),
            categories = [];

        if (diff == 0){
            categories.push(Rally.technicalservices.Toolbox.getTimeHashKey(startTime, key_format));
            categories.push(Rally.technicalservices.Toolbox.getTimeHashKey(endTime, key_format));
            return categories;
        }

        if (diff < 0){
            var temp = startTime;
            startTime = endTime;
            endTime = temp;
        }

        var current_time = startTime;
        while (current_time < endTime){
            categories.push(Rally.technicalservices.Toolbox.getTimeHashKey(current_time,key_format));
            current_time = Rally.util.DateTime.add(current_time, granularity, 1);
        }
        return categories;
    },

    initializeTimeHash: function(startTime, endTime, granularity, key_format){
        var categories = Rally.technicalservices.Toolbox.getTimeCategories(startTime, endTime, granularity, key_format);
        if (categories.length == 0){
            return {};
        }
        return Rally.technicalservices.Toolbox.initializeArrayHash(categories);
    },
    initializeArrayHash: function(categories){
        var hash = {};
        _.each(categories, function(key){
            hash[key] = [];
        });
        return hash;
    },
    getTimeHashKey: function(date, key_format){
        if (!isNaN(Date.parse(date))){
            return Rally.util.DateTime.format(date, key_format);
        }
        return null;
    },
    getCumulativeSumFromTimeHash: function(hash, categories, stopAtToday){
        //First sort, then add.
        var sums = _.map(_.range(categories.length), function(){return 0;}),
            total_sum = 0,
            idx = 0;

        stopAtToday = stopAtToday || false;
        var today = new Date();

        _.each(categories, function(key){
            var date = new Date(key);
            if (stopAtToday && date > today){
                sums[idx++] = null;
            } else {
                if (hash[key]){
                    total_sum += hash[key].length;
                }
                sums[idx++] = total_sum;
            }
        });
        return sums;
    },
    getCategories: function(records, category_field, attribute){
        var categories = [];
        _.each(records, function(r){
            var field_value = Rally.technicalservices.Toolbox._getFieldValue(r,category_field, attribute);
            if (field_value && !Ext.Array.contains(categories,field_value)){
                categories.push(field_value);
            }
        });
        return categories;
    },
    aggregateRecordsByCategory: function(categories, records, category_field, category_attribute){
        var hash = Rally.technicalservices.Toolbox.initializeArrayHash(categories);
        _.each(records, function(r){
            var field = Rally.technicalservices.Toolbox._getFieldValue(r,category_field, category_attribute);
            if (hash[field]){
                hash[field].push(r);
            }
        });
        return hash;
    },
    _getFieldValue: function(record, field, attribute){
        var val = record.get(field) || null;
        if (val && attribute){
            return val[attribute];
        }
        return val;
    },
    getSeriesForFieldValueCount: function(hash, categories, field, field_value){
        var series = [];
        _.each(categories, function(c){
            var recs = hash[c],
                count = 0;
            if (recs && recs.length > 0){
                _.each(recs, function(r){
                    if (r.get(field) == field_value){
                        count++;
                    }
                });
            }
            series.push(count);
        });
        return series;
    },
    aggregateRecordsByField: function(records, field, field_attribute){
        var aggregate_hash = {};

        _.each(records, function(r){
            var field_value = r.get(field);

            if (field_attribute){
                field_value = field_value[field_attribute];
            }

            if (field_value){
                if (!aggregate_hash[field_value]){
                    aggregate_hash[field_value] = [];
                }
                aggregate_hash[field_value].push(r);
            }
        });
        return aggregate_hash;
    }
});
