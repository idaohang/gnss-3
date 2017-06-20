MetronicApp.factory('settingInfo', function () {
    return {
        server: "139.129.212.222",
        //server : 'localhost' ,
        port: "30000",
        socketPort: "6001"
    }

}).factory('signalTypeInfo', function () {
    return [
        'GPS',
        'GLS',
        'BDS'



    ]
}).factory('signalTypObj', function () {
    return  {
        'BDS' : 2,
        'GPS' : 0,
        'GLS' : 1
        //'兼容': 3
    };
});
//区分卫星，原始数据