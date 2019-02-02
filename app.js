'use strict';

const Homey = require('homey');
const { ManagerClock } = require('homey');

class MyApp extends Homey.App {
	
	async onInit() {
		this.log('DarkSky weather app initializing');

		let tz = await ManagerClock.getTimezone();
		this.log(tz);
	}
	
}

module.exports = MyApp;