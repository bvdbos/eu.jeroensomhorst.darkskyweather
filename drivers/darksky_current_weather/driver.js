'use strict';

const Homey = require('homey');
const format = require('string-format')
const https = require("https");

const { ManagerCron } = require('homey');


const GET_DATA_TASK = "eu.jeroensomhorst.darksky.getdata";

const API_URL = "https://api.darksky.net/forecast/{0}/{1},{2}/?exclude=hourly,daily,flags&units=si";

class DarkskyDriver extends Homey.Driver{

    async onInit() {

        Homey.app.log('Initialize driver');
        ManagerCron.unregisterAllTasks();
        this._intervalId = setInterval(() => {
            this.onCronRun();
        },120000);

    }

    async onCronRun(){
        this.getDevices().forEach((device)=>{
            this.handleDevice(device);
        });
    }

    async handleDevice(device){
        if(device.hasValidSettings()){
            try{
                let result = await this.getWeather(device.getApiKey(),device.getLatitude(),device.getLongtitude());
                let weatherInfo = JSON.parse(result.body);
                let current = weatherInfo.currently;

                Homey.app.log("Weather info retrieved: ");
                Homey.app.log(weatherInfo);

                device.setCapabilityValue("measure_temperature",current.temperature);
                device.setCapabilityValue("measure_humidity",current.humidity);
                device.setCapabilityValue("measure_pressure",current.pressure);
                device.setCapabilityValue("measure_rain",current.precipIntensity);
                device.setCapabilityValue("measure_wind_strength",current.windSpeed);
                device.setCapabilityValue("measure_wind_angle",current.windBearing);
                device.setCapabilityValue("measure_gust_strength",current.windGust);
                device.setCapabilityValue("cstm_measure_visibility",current.visibility);
                device.setCapabilityValue("cstm_measure_uvindex",current.uvIndex);
                device.setCapabilityValue("cstm_apparent_temperature",current.apparentTemperature);


            }catch(err){
                Homey.app.log("Could not retrieve api data for device");
                Homey.app.log(err);
            }

        }

    }

    async onPairListDevices(data,cb){
        Homey.app.log("On Pair list devices");
        let devices = [{
            "data": {"id": this._guid()}
        }];

        cb(null,devices);
    }

    _guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }

    validateApiKey(key,lat,long){
        return this.getWeather(key,lat,long);
    }

    async getWeather(key,lat,long){
        Homey.app.log("Get weather info");
        Homey.app.log("key: "+ key);
        Homey.app.log("lat: "+ lat);
        Homey.app.log("long: "+ long);


        let url = format(API_URL,key,lat,long);
        Homey.app.log(url);

        return new Promise((resolve,reject)=>{
            const req  = https.get(url,(res)=>{
                if(res.statusCode === 200) {
                    var body = '';
                    res.on('data', (chunk) => {
                        Homey.app.log("retrieve data");
                        body += chunk;
                    });
                    res.on('end', () => {
                        Homey.app.log("Done retrieval of data");
                        res.body = body;
                        resolve(res);
                    });
                }else{
                    reject(false);
                }
            }).on('error',(err)=>{
                Homey.app.log("Error while connecting to domoticz");
                Homey.app.log(err);
                reject(err);
            });


        });
    }


}

module.exports = DarkskyDriver;