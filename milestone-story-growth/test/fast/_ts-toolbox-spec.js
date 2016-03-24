describe("When using the Rally.technicalservices.Toolbox", function() {

    var wednesday;
    var tuesday;
    var monday;
    var thursday;
    var friday;
    var saturday;
    var sunday;

    beforeEach(function () {
        friday = new Date(2013,8,20,0,0,0);
        saturday = new Date(2013,8,21,0,0,0);
        sunday = new Date(2013,8,22,0,0,0);
        monday = new Date(2013,8,23,0,0,0);
        tuesday = new Date(2013,8,24,0,0,0);
        wednesday = new Date(2013,8,25,0,0,0);
        thursday = new Date(2013,8,26,0,0,0);
    });

    var startTime = new Date(2015,6,23,1,1,1),
        endTime = new Date(2015,7,3,23,59,59),
        records = [
        Ext.create('mockStory',{
            ObjectID: 1,
            Name: 'story 1',
            CreationDate: new Date(2015,6,26,1,2,3)
        }),
        Ext.create('mockStory',{
            ObjectID: 2,
            Name: 'story 2',
            CreationDate: new Date(2015,6,26,2,2,3)
        }),
        Ext.create('mockStory',{
            ObjectID: 3,
            Name: 'story 3',
            CreationDate: new Date(2015,6,28,1,2,3)
        }),
        Ext.create('mockStory',{
            ObjectID: 4,
            Name: 'story 5',
            CreationDate: new Date(2015,6,30,1,2,3)
        })
    ];


    it("should populate a date hash correctly",function(){
        var hash = Rally.technicalservices.Toolbox.populateTimeHash(startTime, endTime, 'day', 'Y-m-d', records, 'CreationDate');
        console.log(hash);
        expect(hash["2015-07-23"].length).toBe(0);
        expect(hash["2015-07-24"].length).toBe(0);
        expect(hash["2015-07-25"].length).toBe(0);
        expect(hash["2015-07-26"][0].get('ObjectID')).toBe(1);
        expect(hash["2015-07-26"][1].get('ObjectID')).toBe(2);
        expect(hash["2015-07-27"].length).toBe(0);
        expect(hash["2015-07-28"][0].get('ObjectID')).toBe(3);

        expect(hash["2015-07-29"].length).toBe(0);
        expect(hash["2015-07-30"].length).toBe(1);
        expect(hash["2015-07-30"][0].get('ObjectID')).toBe(4);
        expect(hash["2015-08-01"].length).toBe(0);
        expect(hash["2015-08-02"].length).toBe(0);
        expect(hash["2015-08-03"].length).toBe(0);
        expect(hash["2015-08-04"]).not.toBeDefined();
    });

    it ("should populate a series correctly", function(){
        var hash = Rally.technicalservices.Toolbox.populateTimeHash(startTime, endTime, 'day', 'Y-m-d', records, 'CreationDate');
        var series = Rally.technicalservices.Toolbox.getCumulativeSumFromTimeHash(hash, 'Y-m-d');

        expect(series[0]).toBe(0);
        expect(series[1]).toBe(0);
        expect(series[2]).toBe(0);
        expect(series[3]).toBe(2);
        expect(series[4]).toBe(2);
        expect(series[5]).toBe(3);
        expect(series[6]).toBe(3);
        expect(series[7]).toBe(4);
        expect(series[8]).toBe(4);
        expect(series[9]).toBe(4);
        expect(series[10]).toBe(4);
        expect(series[11]).toBe(4);
        expect(series[12]).not.toBeDefined();

    });

});
