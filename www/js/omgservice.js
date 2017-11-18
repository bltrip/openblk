function OMGService(serviceUrl) {
   this.url = serviceUrl || "";
}

OMGService.prototype.post = function (data, callback) {

	var xhr = new XMLHttpRequest();
	xhr.open("POST", this.url + "/data/", true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {

			var results = JSON.parse(xhr.responseText);
			if (results.id) {
				console.log("post omg good id= " + results.id);
				data.id = results.id;
				if (callback)
					callback(results);
			} else {
				console.log(results);
			}
		}
	};

   xhr.setRequestHeader("Content-type", "application/json");
   xhr.send(JSON.stringify(data));
};


OMGService.prototype.getId = function (id, callback) {

	var xhr = new XMLHttpRequest();
	xhr.open("GET", this.url + "/data/" + id, true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {

			var results = JSON.parse(xhr.responseText);
			if (results.id) {
				console.log("get omg id");
            console.log(results);
				if (callback)
					callback(results);
			} else {
				console.log(results);
			}
		}
	};
   xhr.send();
};

OMGService.prototype.getQueryString = function () {
	// see if there's somethign to do here
	var rawParams = document.location.search;
	var nvp;
	var params = {}

	if (rawParams.length > 1) {
		rawParams.slice(1).split("&").forEach(function (param) {
			nvp = param.split("=");
			params[nvp[0]] = nvp[1];
		});
	}
	return params;
};

OMGService.prototype.deleteId = function (id, callback) {

	var xhr = new XMLHttpRequest();
	xhr.open("DELETE", this.url + "/data/" + id, true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {

			var results = JSON.parse(xhr.responseText);
			console.log(results);
			if (callback)
				callback(results);
		}
	};
   xhr.send();
};
