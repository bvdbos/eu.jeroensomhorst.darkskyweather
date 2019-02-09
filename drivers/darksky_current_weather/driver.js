'use strict';

const Homey = require('homey');
const format = require('string-format')
const https = require("https");
const HOUR_MILLISECONDS = 3600;
const API_URL = "https://api.darksky.net/forecast/{0}/{1},{2}/?exclude=hourly,flags&units=si";

const FLOW_CONDITION_MAXTEMP = "condition_maxtemp";
const FLOW_CONDITION_MINTEMP = "condition_mintemp";

const CAPABILITY_MAX_TEMPERATURE = "cstm_measure_temperature_high";
const CAPABILITY_MIN_TEMPERATURE = "cstm_measure_temperature_low";

const CRONTASK_RETRIEVEWEATHERINFO = "eu.jeroensomhorst.darkskyweather.cron";

class DarkskyDriver extends Homey.Driver{

    async onInit() {

        this.log('Initialize driver');

        Homey.ManagerCron.getTask(CRONTASK_RETRIEVEWEATHERINFO)
            .then(task => {
                this.log("The task exists: " + CRONTASK_RETRIEVEWEATHERINFO);
                task.on('run', () => this.onCronRun());
            })
            .catch(err => {
                if (err.code === 404) {
                    this.log("The task has not been registered yet, registering task: " + CRONTASK_RETRIEVEWEATHERINFO);
                    Homey.ManagerCron.registerTask(CRONTASK_RETRIEVEWEATHERINFO, "1 */1 * * * *", {})
                        .then(task => {
                            task.on('run', () => this.onCronRun());
                        })
                        .catch(err => {
                            this.log(`problem with registering cronjob: ${err.message}`);
                        });
                } else {
                    this.log(`other cron error: ${err.message}`);
                }
            });

        this.retrievedDaily = -1;
        this.registerTriggers();

    }

    registerTriggers(){}


    async onCronRun(){
        this.log("cron run!");

        this.getDevices().forEach((device)=>{
            this.handleDevice(device);
        });
    }

    async handleDevice(device){
        if (!device.hasValidSettings()) {
            return;
        }
        try {
            let result;
            result = await this.getWeather(device.getApiKey(), device.getLatitude(), device.getLongtitude());
            if(result!==null) {
                let weatherInfo = JSON.parse(result.body);
                let current = weatherInfo.currently;
                let daily = weatherInfo.daily.data;

                device.setCapabilityValue("measure_temperature", current.temperature);
                device.setCapabilityValue("measure_humidity", current.humidity * 100);
                device.setCapabilityValue("measure_pressure", current.pressure);
                device.setCapabilityValue("measure_rain", current.precipIntensity);
                device.setCapabilityValue("measure_wind_strength", current.windSpeed);
                device.setCapabilityValue("measure_wind_angle", current.windBearing);
                device.setCapabilityValue("measure_gust_strength", current.windGust);
                device.setCapabilityValue("cstm_measure_visibility", current.visibility);
                device.setCapabilityValue("cstm_measure_uvindex", current.uvIndex);
                device.setCapabilityValue("cstm_apparent_temperature", current.apparentTemperature);

                let currentEpoch = (new Date).getTime();
                let timeDifference = this.retrievedDaily - currentEpoch;

                if (timeDifference < 0 || timeDifference >= HOUR_MILLISECONDS) {
                    device.setCapabilityValue("cstm_measure_temperature_high", daily[0].temperatureHigh);
                    device.setCapabilityValue("cstm_measure_temperature_low", daily[0].temperatureLow);
                    device.setCapabilityValue("cstm_measure_temperature_hightime", DarkskyDriver.formatDate(daily[0].temperatureHighTime));
                    device.setCapabilityValue("cstm_measure_temperature_lowtime", DarkskyDriver.formatDate(daily[0].temperatureLowTime));
                    this.retrievedDaily = currentEpoch;
                }
            }
        } catch (err) {
            this.log("Could not retrieve api data for device");
            this.log(err);
        }

    }

    static formatDate(epoch){

        let date = new Date(epoch*1000);
        let hours = date.getHours();
        let minutes = "0" + date.getMinutes();
        let seconds = "0" + date.getSeconds();
        return hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
    }

    async onPairListDevices(data,cb){
        this.log("On Pair list devices");
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
        this.log("Get weather info");
        this.log("key: "+ key);
        this.log("lat: "+ lat);
        this.log("long: "+ long);


        let url = format(API_URL,key,lat,long);
        this.log(url);

        return new Promise((resolve,reject)=>{
            https.get(url,(res)=>{
                if(res.statusCode === 200) {
                    let body = [];
                    res.on('data', (chunk) => {
                        this.log("retrieve data");
                        body.push(chunk);
                    });
                    res.on('end', () => {
                        this.log("Done retrieval of data");
                        resolve({
                            "body": Buffer.concat(body)
                        });
                    });
                }else{
                    reject(null);
                }
            }).on('error',(err)=>{
                this.log("Error while connecting to domoticz");
                this.log(err);
                reject(err);
            });


        });
    }


}

module.exports = DarkskyDriver;