"use strict";
/* Depencies */
const express = require("express");
const bodyParser = require("body-parser");
const uuid = require("uuid");
const ObjectID = require("mongodb").ObjectID;
const port = 8000;
const app = express();

/* Databse objects */
const _companies  = require("./company");
const _users = require("./user");
const _punchcards = require("./punchcard");
const ADMIN_TOKEN = "123";

/* Init */
app.use(bodyParser.json());
app.listen(port, () => {
	console.log("Server is on port", port);
});


/**
*	Returns a clist of all companies
*/
app.get("/api/company", (req, res) => {
	_companies.getCompanies({}, (err, dbrs) => {
		if(internalError(res, err)) return;

		res.send(dbrs);
		return;
	});
});

/**
*	Returns a single company with the given id	
*/
app.get("/api/company/:id", (req, res) => {
	_companies.getCompanies({ _id: new ObjectID(req.params.id) }, (err, dbrs) => {
		if(internalError(res, err)) return;
		if(dbrs.length === 0) {
			res.status(404).send("COMPANY_NOT_FOUND");
			return;
		}

		res.send(dbrs[0]);
		return;
	});
});

/**
*	Adds a new company to the 'database' 
*	Must specify a name and punch count
*/
app.post("/api/company", (req, res) => {
	if(req.headers.token !== ADMIN_TOKEN) {
		res.status(401).send("ADMIN_ACCESS_ONLY");
		return;
	}

	if(!req.body.hasOwnProperty("name")) {
		res.status(412).send("MUST_SPECIFY_NAME");
		return;
	}

	if(!req.body.hasOwnProperty("description")) {
		res.status(412).send("MUST_SPECIFY_DESCRIPTION");
		return;
	}

	if(!req.body.hasOwnProperty("punchard_lifetime")) {
		res.status(412).send("MUST_SPECIFY_PUNCHCARD_LIFETIME");
	}

	_companies.addCompany(req.body, (err, dbrs) => {
		if(internalError(res, err)) return;

		res.status(201).send("OK");
	});
});


/**
*	Returns a list of all users
*/
app.get("/user", (req, res) => {
	const users = [];
	_users.getUsers({}, (err, dbrs) => {
		if(internalError(res, err)) return;

		/* Doing this the stupid way because I'm not using mongoose */
		for(var i = 0; i < dbrs.length; ++i) {
			console.log(dbrs[i].token);
			users.push({
				_id: dbrs[i]._id,
				name: dbrs[i].name,
				age: dbrs[i].age,
				gender: dbrs[i].gender
			});
		}

		res.send(users);
	});
});

/**
*	Adds a new user to the list of users
*	Name,email, age and gender must be specified
*/
app.post("/user", (req, res) => {
	/* Poor man's error checking */
	if(!req.body.hasOwnProperty("name")) {
		res.status(412).send("MUST_SPECIFY_NAME");
		return;
	}

	if(!req.body.hasOwnProperty("email")) {
		res.status(412).send("MUST_SPECIFY_EMAIL");
		return;
	}

	if(!req.body.hasOwnProperty("age")) {
		res.status(412).send("MUST_SPECIFY_AGE");
		return;
	}

	if(!req.body.hasOwnProperty("gender")) {
		res.status(412).send("MUST_SPECIFY_GENDER");
		return;
	}

	/* Adding extra database values */
	if(req.body.punches === undefined) req.body.punches = [];
	req.body.token = uuid.v1();

	_users.addUser(req.body, (err, dbrs) => {
		if(internalError(res, err)) return;

		res.status(201).send("OK");
	});
});

/* Returns a list of punchcards */
app.get("/punchcard", (req, res) => {
	_punchcards.getPunchcards({}, (err, dbrs) => {
		if(internalError(res, err)) return;

		res.send(dbrs);
	});
});

/* Adds a new punchcard to this company */
app.post("/punchcard/:company_id", (req, res) => {
	if(!req.headers.token.hasOwnProperty) {
		res.status(401).send("AUTHENTICATED_USERS_ONLY");
		return;
	}

	/* If posted data is incorrect, which it can't be */
	if(false) {
		res.status(412).send("MUST_SPECIFY_WHATEVER");
		return;
	}

	/* Fetching the company from the company id */
	_companies.getCompanies({ _id: new ObjectID(req.params.company_id) }, (cErr, companies) => {
		if(internalError(res, cErr)) return;
		if(companies.length === 0) {
			res.status(404).send("COMPANY_NOT_FOUND");
			return;
		}

		/* Fetching the user id from the user token */
		_users.getUsers({ token: req.headers.token }, (uErr, users) => {
			if(internalError(res, uErr)) return;
			if(users.length === 0) {
				res.status(401).send("USER_NOT_FOUND");
				return;
			}

			/* Providing extra database values */
			req.body.user_id = users[0]._id;
			req.body.company_id = req.params.company_id;
			req.body.created = Date.now();

			/* Check if user already has a punchcard */
			_punchcards.getPunchcards({ user_id: new ObjectID(req.body.user_id) }, (puErr, punchcards) => {
				if(punchcards.length !== 0) {
					res.status(409).send("USER_ALREADY_HAS_PUNCHCARD");
					return;
				}

				/* Everything is in order, we can add the punchcard */
				_punchcards.addPunchcard(req.body, (pErr, dbrs) => {
					if(internalError(dbrs, pErr)) return;
					console.log(dbrs);

					res.status(201).send(dbrs.ops[0]._id);
					return;
				});
			});
		});
	});
});


/* Helper functions */
function internalError(res, err) {
	if(err) {
		res.status(500).send("INTERNAL_ERROR");
		return true;
	}
	return false;
} 