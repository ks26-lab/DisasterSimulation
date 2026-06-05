const response = await fetch(
    "http://localhost:3000/search-disasters",
    {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            searchFeatures: {
                disasterType: "Flood",
                severity: "HIGH"
            }
        })
    }
);

const data = await response.json();

console.log(data);