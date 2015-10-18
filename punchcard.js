"use strict";
/* Requirements */
const MongoClient = require("mongodb").MongoClient;

/* Init */
const url = "mongodb://localhost:27017/app";

/* Database functions */

/* Returns a list of all punchcards */
function getPunchcards(query, cb) {
	MongoClient.connect(url, (err, db) => {
		if(databaseError(db, err, cb)) return;

		const collection = db.collection("punchcard");
		collection.find(query).toArray((ierr, res) => {
			if(databaseError(db, ierr, cb)) return;

			returnOK(db, res, cb);
		});
	});
};

/* Adds a new punchcard to the database for the specified company */
function addPunchcard(data, cb) {
	MongoClient.connect(url, (err, db) => {
		if(databaseError(db, err, cb)) return;

		const collection = db.collection("punchcard");
		collection.insert(data, (ierr, res) => {
			if(databaseError(db, ierr, cb)) return;

			returnOK(db, res, cb);
		});
	});
};


/* Helper functions */

/* Takes care of calling the call back function
*  with the error message and closing the database.
*/
function databaseError(db, err, cb) {
	if(err) {
		cb(err);
		db.close();
		return true;
	}
	return false;
};

/* Returns the response and closes the database */
function returnOK(db, res, cb) {
	cb(undefined, res);
	db.close();
};

/* Exports */
module.exports = {
	getPunchcards: getPunchcards,
	addPunchcard: addPunchcard
};