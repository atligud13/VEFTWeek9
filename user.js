"use strict";
/* Requirements */
const MongoClient = require("mongodb").MongoClient;

/* Init */
const url = "mongodb://localhost:27017/app";

/* Database functions */

function getUsers(query, cb) {
	MongoClient.connect(url, (err, db) => {
		if(databaseError(db, err, cb)) return;

		const collection = db.collection("user");
		collection.find(query).toArray((ierr, res) => {
			if(databaseError(db, ierr, cb)) return;

			returnOK(db, res, cb);
		});
	});
};

function addUser(data, cb) {
	MongoClient.connect(url, (err, db) => {
		if(databaseError(db, err, cb)) return;

		const collection = db.collection("user");
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
	addUser: addUser,
	getUsers: getUsers
};