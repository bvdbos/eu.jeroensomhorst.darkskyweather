'use strict';

const Homey = require('homey');

class DarkskyDevice extends Homey.Device{

    onInit(){
        Homey.app.log('Initialize device');
    }

    onAdded(){
        Homey.app.log('Adding new device!');
    }

    onDeleted(){
        Homey.app.log('Removing device');
    }

    async onSettings(oldSettingsObj, newSettingsObj, changedKeys){
        let driver = this.getDriver();
        let apiKey = newSettingsObj.apikey || "";
        let longtitude  = newSettingsObj.longtitude || 0;
        let latitude    = newSettingsObj.latitude || 0;

        if(changedKeys.indexOf('apikey') >= 0){
            apiKey = newSettingsObj.apikey;

            if(apiKey == null || apiKey.trim() === ""){
                throw new Error(Homey.__("settings_apikey_required"));
            }

            apiKey = newSettingsObj.apikey.trim();

        }
        if(changedKeys.indexOf("latitude")){
            if(!(newSettingsObj.latitude > -90 && newSettingsObj.latitude < 90)){
                throw new Error(Homey.__("settings_invalid_latitude"));
            }
        }

        if(changedKeys.indexOf("longtitude")) {
            if (!(newSettingsObj.longtitude > -180 && newSettingsObj.longtitude < 180)) {
                throw new Error(Homey.__("settings_invalid_longtitude"));
            }
        }


        let validKey = await driver.validateApiKey(apiKey,latitude, longtitude);

        if(!validKey){
            throw new Error(Homey.__("settings_apikey_invalid"));
        }
    }

    hasValidSettings(){
        let settings = this.getSettings();
        return (settings.hasOwnProperty('apikey') && settings.hasOwnProperty('latitude') && settings.hasOwnProperty('longtitude'));
    }

    getApiKey(){
        let settings = this.getSettings();
        return settings.apikey;
    }

    getLatitude(){
        let settings = this.getSettings();
        return settings.latitude;
    }
    getLongtitude(){
        let settings = this.getSettings();
        return settings.longtitude;
    }

}

module.exports = DarkskyDevice