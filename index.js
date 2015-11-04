"use strict";
/* Depencies */
const express = require("express");
const bodyParser = require("body-parser");
const uuid = require("uuid");
const ObjectID = require("mongodb").ObjectID;
const elasticsearch = require("elasticsearch");
const port = 8000;
const app = express();

/* Databse objects */
const _companies  = require("./company");
const _users = require("./user");
const _punchcards = require("./punchcard");
const ADMIN_TOKEN = "123";

/* Init elastic search */
const client = new elasticsearch.Client({
	host: "localhost:9200",
	log: "error"
});

/* Init */
app.use(bodyParser.json());
app.listen(port, () => {
	console.log("Server is on port", port);
});


/**
*	Returns a clist of all companies
*/
app.get("/api/company", (req, res) => {
	if(req.query.page !== undefined && req.query.max !== undefined) {
		const searchPromise = client.search({
			"index": "companies",
			"type": "company",
			"from": req.query.page, "size": req.query.max,
			/* For some reason the sort does not want to work
			"sort" : [
		      { "name" : { "order" : "asc", "unmapped_type":"string" } }
		   ]
		   */
		});
		searchPromise.then((doc) => {
			res.send(doc.hits.hits);
		},(err) => {
			res.status(500).send(err);
		});
		return;
	}
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
*	Deletes the company with the given id
*/
app.delete("/api/company/:id", (req, res) => {
	const id = new ObjectID(req.params.id);
	_companies.deleteCompany({ _id: id }, (err, dbrs) => {
		if(err) res.status(404).send("COMPANY_NOT_FOUND");

		const promise = client.delete({
		  index: 'companies',
		  type: 'company',
		  id: id.toString()
		});

		promise.then((doc) => {
			res.status(200).send("COMPANY_DELETED");
		}, (err) => {
			res.status(500).send(err);
		});
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

	if(!req.is("application/json")) {
		res.status(412).send("Incorrect content type");
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

	const searchPromise = client.search({
		"index": "companies",
		"type": "company",
		"body": {
			"query": {
				"match": {
					"name": req.body.name
				}
			}
		}
	});

	searchPromise.then((doc) => {
		if(doc.hits.total > 0) { 
			res.status(409).send("COMPANY_NAME_ALREADY_IN_USE");
			return;
		}
		/* Otherwise we carry on */
		_companies.addCompany(req.body, (err, dbrs) => {
			if(internalError(dbrs, err)) return;
			const promise = client.index({
				"index": "companies",
				"type": "company",
				"id": dbrs.ops[0]._id.toString(),
				"body": req.body
			});
			promise.then((doc) => {
				res.send({ id: dbrs.ops[0]._id });
			}, (err) => {
				res.status(500).send(err);
			});
		});
	}, (err) => {
		/* Error probably means that the index has not been created */
		/* Not really sure about this to be honest */
		_companies.addCompany(req.body, (err, dbrs) => {
			if(internalError(dbrs, err)) return;

			const promise = client.index({
				"index": "companies",
				"type": "company",
				"id": dbrs.ops[0]._id,
				"body": req.body
			});
			promise.then((doc) => {
				res.send({ id: dbrs.ops[0]._id });
			}, (err) => {
				console.log("Error indexing");
				console.log(err);
				res.status(500).send(err);
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