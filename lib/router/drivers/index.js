const express = require("express");
const router = express.Router();

const trips = require("./trips");

router.get("/trips", trips.list);
router.get("/trips/current", trips.current);
router.route("/trips/:id")
    .get(trips.get)
    .put(trips.update);

module.exports = {
    baseUrl: "/drivers",
    router
};