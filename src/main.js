import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";



// =====================
// Viewer
// =====================

const viewer = new Cesium.Viewer("cesiumContainer");

viewer.clock.shouldAnimate = true;
viewer.clock.multiplier = 60;

viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
        78.0322,
        30.3165,
        5000
    )
});


// =====================
// UI Elements
// =====================


const geminiObservationDisplay =
    document.getElementById(
        "geminiObservation"
    );


const waterDisplay =
    document.getElementById("waterDisplay");

const riskDisplay =
    document.getElementById("riskDisplay");

const populationDisplay =
    document.getElementById("populationDisplay");

const recommendationDisplay =
    document.getElementById(
        "recommendationDisplay"
    );

const recoveryDisplay =
    document.getElementById(
        "recoveryDisplay"
    );

const timeDisplay =
    document.getElementById(
        "timeDisplay"
    );

const rainfallInput =
    document.getElementById("rainfall");

const riverFlowInput =
    document.getElementById("riverFlow");

const drainageInput =
    document.getElementById("drainage");

const startBtn =
    document.getElementById("startBtn");

const pauseBtn =
    document.getElementById("pauseBtn");

const resetBtn =
    document.getElementById("resetBtn");
const trendDisplay =
    document.getElementById(
        "trendDisplay"
    );

const eventDisplay =
    document.getElementById(
        "eventDisplay"
    );

const summaryDisplay =
    document.getElementById(
        "summaryDisplay"
    );
const eventLogDisplay =
    document.getElementById(
        "eventLogDisplay"
    );
// =====================
// Simulation Variables
// =====================

let simulationRunning = false       ;

let rainfall = 50;
let riverFlow = 20;
let drainage = 10;

let waterLevel = 10;
let floodDirection = 1;

let lastUpdate = Date.now();
let lastGeminiCall = 0;
let geminiBusy = false;

// =====================
// Flood Zone
// =====================

const floodZone = viewer.entities.add({
    polygon: {
        hierarchy:
            Cesium.Cartesian3.fromDegreesArray([
                78.028, 30.314,
                78.035, 30.314,
                78.035, 30.320,
                78.028, 30.320
            ]),

        material:
            Cesium.Color.BLUE.withAlpha(
                0.5
            ),

        extrudedHeight: waterLevel
    }
});

// =====================
// Infrastructure
// =====================

viewer.entities.add({
    position:
        Cesium.Cartesian3.fromDegrees(
            78.031,
            30.317,
            25
        ),

    box: {
        dimensions:
            new Cesium.Cartesian3(
                100,
                100,
                50
            ),

        material:
            Cesium.Color.RED
    }
});

viewer.entities.add({
    position:
        Cesium.Cartesian3.fromDegrees(
            78.033,
            30.318,
            25
        ),

    box: {
        dimensions:
            new Cesium.Cartesian3(
                100,
                100,
                50
            ),

        material:
            Cesium.Color.YELLOW
    }
});

viewer.entities.add({
    position:
        Cesium.Cartesian3.fromDegrees(
            78.034,
            30.316,
            15
        ),

    box: {
        dimensions:
            new Cesium.Cartesian3(
                150,
                40,
                20
            ),

        material:
            Cesium.Color.GRAY
    }
});

// =====================
// Asset Registry
// =====================

const assets = [
    {
        name: "Hospital",
        floodLevel: 25,
        population: 500,
        flooded: false
    },

    {
        name: "School",
        floodLevel: 35,
        population: 300,
        flooded: false
    },

    {
        name: "Bridge",
        floodLevel: 45,
        population: 200,
        flooded: false
    }
];

// =====================
// Sensors
// =====================

const sensors = {
    waterLevel: 0,

    hospitalFlooded: false,
    schoolFlooded: false,
    bridgeFlooded: false,

    affectedPopulation: 0,

    riskLevel: "LOW",

    recoveryPhase: false
};


let latestGeminiObservation =
    "Waiting for observation...";

// =====================
// Recommendation Engine
// =====================

function generateRecommendation(
    state
) {
    if (
        state.riskLevel ===
        "CRITICAL"
    ) {
        return (
            "🚨 Immediate Evacuation"
        );
    }

    if (
        state.riskLevel ===
        "HIGH"
    ) {
        return (
            "⚠️ Prepare Evacuation"
        );
    }

    if (
        state.riskLevel ===
        "MEDIUM"
    ) {
        return (
            "👀 Monitor Situation"
        );
    }

    return "✅ Situation Normal";
}

// =====================
// Observation Agent
// =====================

    class ObservationAgent {

        constructor() {
            this.previousState = null;
            this.eventLog = [];
        }
        
        addEvent(event) {

        const time =
            new Date()
                .toLocaleTimeString();

        this.eventLog.push(
            `${time} - ${event}`
        );

        if (
            this.eventLog.length > 10
        ) {
            this.eventLog.shift();
        }
    }
        observe(state) {

    let trend = "STABLE";
    const events = [];

    if (this.previousState) {

        // Trend Detection
        if (
            state.waterLevel >
            this.previousState.waterLevel
        ) {
            trend = "RISING";
        }
        else if (
            state.waterLevel <
            this.previousState.waterLevel
        ) {
            trend = "FALLING";
        }

        // Risk Change Detection
        if (
            state.riskLevel !==
            this.previousState.riskLevel
        ) {
            const event =
                `RISK_CHANGED`;

            events.push(event);

            this.addEvent(event);
        }

        // Recovery Started
        if (
            !this.previousState.recoveryPhase &&
            state.recoveryPhase
        ) {
            const event =
                "RECOVERY_STARTED";

            events.push(event);

            this.addEvent(event);
        }

        // Critical Water Level
        if (
            state.waterLevel >= 100 &&
            this.previousState.waterLevel < 100
        ) {
            const event =
                "CRITICAL_WATER_LEVEL";

            events.push(event);

            this.addEvent(event);
        }
    }

    this.previousState =
        structuredClone(state);

    return {

        trend,

        events,

        eventLog:
            this.eventLog,

        summary:
            `Risk is ${state.riskLevel}.
             ${state.affectedPopulation}
             people affected.`
    };
}

generateObservation(snapshot) {

    return `
Current Risk Level: ${snapshot.environment.riskLevel}

Current Water Level:
${snapshot.environment.waterLevel.toFixed(1)}

Affected Population:
${snapshot.population.affectedPopulation}

Recovery Active:
${snapshot.recovery.active}
`;
}

generateAgentReport(
    state,
    observationReport
) {

    return {

        metadata: {

            reportType:
                "OBSERVATION",

            reportVersion:
                "1.0",

            generatedBy:
                "ObservationAgent",

            timestamp:
                new Date()
                    .toISOString()
        },

        location: {

            latitude:
                30.3165,

            longitude:
                78.0322,

            region:
                "Dehradun",

            state:
                "Uttarakhand",

            country:
                "India"
        },

        disaster: {

            type:
                "Flood",

            subType:
                "River Flood",

            status:
                "ACTIVE",

            severity:
                state.riskLevel
        },

        environment: {

            waterLevel:
                state.waterLevel,

            trend:
                observationReport.trend,

            recoveryActive:
                state.recoveryPhase
        },

        population: {

            affectedPopulation:
                state.affectedPopulation
        },

        infrastructure: {

            hospitalFlooded:
                sensors.hospitalFlooded,

            schoolFlooded:
                sensors.schoolFlooded,

            bridgeFlooded:
                sensors.bridgeFlooded
        },

        observation: {

            riskLevel:
                state.riskLevel,

            events:
                observationReport.events
        },

        disasterFingerprint: {

            disasterType:
                "Flood",

            severity:
                state.riskLevel,

            trend:
                observationReport.trend
        },

        severityMetrics: {

            waterLevel:
                state.waterLevel,

            affectedPopulation:
                state.affectedPopulation,

            floodedAssets: [

                sensors.hospitalFlooded,

                sensors.schoolFlooded,

                sensors.bridgeFlooded

            ].filter(Boolean).length
        },
historicalSearchRequest: {

    enabled: true,

    searchType:
        "SIMILAR_DISASTERS",

    lookbackYears:
        10,

    minimumSimilarity:
        0.75
},
searchFeatures: {

    disasterType:
        "Flood",

    severity:
        state.riskLevel,

    region:
        "Dehradun",

    trend:
        observationReport.trend,

    affectedPopulation:
        state.affectedPopulation,

    floodedAssets: [

        sensors.hospitalFlooded,

        sensors.schoolFlooded,

        sensors.bridgeFlooded

    ].filter(Boolean).length
},
reportStatus: {

    verified: true,

    confidence: 0.95,

    requiresHistoricalAnalysis:
        true
},

searchPriorities: {

    primary: [

        "disasterType",

        "severity"

    ],

    secondary: [

        "trend",

        "affectedPopulation"

    ],

    tertiary: [

        "region",

        "floodedAssets"

    ]
},
    };
}
generateSnapshot(state) {

    return {

        timestamp:
            new Date().toISOString(),

        environment: {

            waterLevel:
                state.waterLevel,

            riskLevel:
                state.riskLevel
        },

        population: {

            affectedPopulation:
                state.affectedPopulation
        },

        recovery: {

            active:
                state.recoveryPhase
        },

        infrastructure: {

    hospitalFlooded:
        sensors.hospitalFlooded,

    schoolFlooded:
        sensors.schoolFlooded,

    bridgeFlooded:
        sensors.bridgeFlooded
},
    };
}
generateHumanReport(
    agentReport
) {

    return {

        title:
            "Initial Situation Summary",

        severity:
            agentReport
                .situation
                .riskLevel,

        summary:
            `Water level is
             ${agentReport.situation.waterLevel.toFixed(1)}.
             Risk level is
             ${agentReport.situation.riskLevel}.
             ${agentReport.population.affectedPopulation}
             people are affected.`,

        keyPoints: [

            `Trend:
             ${agentReport.situation.trend}`,

            `Hospital Flooded:
             ${agentReport.infrastructure.hospitalFlooded}`,

            `Recovery Active:
             ${agentReport.situation.recoveryActive}`
        ]
    };
}

    
}




// =====================
// Mock Historical Database
// =====================

// const historicalRecords = [

//     {
//         recordId: "FLOOD_001",

//         disasterType: "Flood",

//         severity: "MEDIUM",

//         trend: "RISING",

//         affectedPopulation: 500,

//         floodedAssets: 1
//     },

//     {
//         recordId: "FLOOD_002",

//         disasterType: "Flood",

//         severity: "HIGH",

//         trend: "RISING",

//         affectedPopulation: 1000,

//         floodedAssets: 2
//     },

//     {
//         recordId: "FLOOD_003",

//         disasterType: "Flood",

//         severity: "LOW",

//         trend: "STABLE",

//         affectedPopulation: 0,

//         floodedAssets: 0
//     }
// ];


// class ElasticSearchService {

//     constructor() {

//         this.serviceName =
// //             "ElasticSearchService";
// //     }

// //     search(searchReport) {

// //         const matches =
// //             historicalRecords.filter(
// //                 record =>
// //                     record.disasterType ===
// //                     searchReport.searchFeatures.disasterType
// //             );

// //         return matches;
// //     }
// // }

// =====================
// HistoricalAnalysisAgent
// =====================


class HistoricalAnalysisAgent {

    constructor() {

        this.agentName =
            "HistoricalAnalysisAgent";

    }

    processReport(agentReport) {

        if (
            !agentReport
                .historicalSearchRequest
                .enabled
        ) {

            return null;
        }

        return {

            metadata: {

                reportType:
                    "HISTORICAL_SEARCH",

                generatedBy:
                    "HistoricalAnalysisAgent",

                timestamp:
                    new Date()
                        .toISOString()
            },

            searchRequest: {

                searchType:
                    agentReport
                        .historicalSearchRequest
                        .searchType,

                lookbackYears:
                    agentReport
                        .historicalSearchRequest
                        .lookbackYears,

                minimumSimilarity:
                    agentReport
                        .historicalSearchRequest
                        .minimumSimilarity
            },

            searchFeatures:
                agentReport
                    .searchFeatures,

            disasterFingerprint:
                agentReport
                    .disasterFingerprint
        };
    }
}


// =====================
// Buttons
// =====================

startBtn.addEventListener(
    "click",
    () => {
        simulationRunning = true;
viewer.clock.shouldAnimate = true;

        rainfall =
            Number(
                rainfallInput.value
            );

        riverFlow =
            Number(
                riverFlowInput.value
            );

        drainage =
            Number(
                drainageInput.value
            );
    }
);

pauseBtn.addEventListener(
    "click",
    () => {

        simulationRunning =
            !simulationRunning;

        viewer.clock.shouldAnimate =
            simulationRunning;

        pauseBtn.textContent =
            simulationRunning
            ? "Pause Simulation"
            : "Resume Simulation";
    }
);

resetBtn.addEventListener(
    "click",
    () => {

        waterDisplay.textContent = "10";
        riskDisplay.textContent = "LOW";
        populationDisplay.textContent = "0";
        recommendationDisplay.textContent =
        "✅ Situation Normal";
        recoveryDisplay.textContent = "No";
        waterLevel = 10;

        assets.forEach(asset => {
            asset.flooded = false;
        });

        sensors.waterLevel = 0;

        sensors.hospitalFlooded =
            false;

        sensors.schoolFlooded =
            false;

        sensors.bridgeFlooded =
            false;

        sensors.affectedPopulation =
            0;

        sensors.riskLevel = "LOW";

        sensors.recoveryPhase =
            false;

        floodZone.polygon
            .extrudedHeight =
            waterLevel;
    }
);
const observationAgent =
    new ObservationAgent();


const historicalAgent =
    new HistoricalAnalysisAgent();


// =====================
// Elastic Search Service
// =====================


 



// =====================
// Main Simulation Loop
// =====================

viewer.clock.onTick.addEventListener(
   async () => {

        if (
            !simulationRunning
        ) {
            return;
        }

        const now =
            Date.now();

        if (
            now - lastUpdate <
            1000
        ) {
            return;
        }

        lastUpdate = now;

        waterLevel +=
            (
                rainfall * 0.1 +
                riverFlow * 0.05 -
                drainage * 0.08
            ) * floodDirection;

        if (
            waterLevel >= 200
        ) {
            floodDirection = -1;
        }

        if (
            waterLevel <= 10
        ) {
            floodDirection = 1;
        }

        sensors.recoveryPhase =
            waterLevel < 50 &&
            floodDirection === -1;

        sensors.waterLevel =
            waterLevel;

        assets.forEach(asset => {

            if (
                waterLevel >=
                asset.floodLevel &&
                !asset.flooded
            ) {
                asset.flooded =
                    true;
            }

        });

        sensors.hospitalFlooded =
            assets[0].flooded;

        sensors.schoolFlooded =
            assets[1].flooded;

        sensors.bridgeFlooded =
            assets[2].flooded;

        sensors.affectedPopulation =
            assets
                .filter(
                    a => a.flooded
                )
                .reduce(
                    (sum, a) =>
                        sum +
                        a.population,
                    0
                );

        if (
            waterLevel < 25
        ) {
            sensors.riskLevel =
                "LOW";
        }
        else if (
            waterLevel < 50
        ) {
            sensors.riskLevel =
                "MEDIUM";
        }
        else if (
            waterLevel < 100
        ) {
            sensors.riskLevel =
                "HIGH";
        }
        else {
            sensors.riskLevel =
                "CRITICAL";
        }

        floodZone.polygon
            .extrudedHeight =
            waterLevel;

        const disasterState = {
            waterLevel:
                sensors.waterLevel,

            riskLevel:
                sensors.riskLevel,

            affectedPopulation:
                sensors.affectedPopulation,

            recoveryPhase:
                sensors.recoveryPhase
        };

        const snapshot =
    observationAgent.generateSnapshot(
        disasterState
    );


   
    const observationText =
    observationAgent.generateObservation(
        snapshot
    );

console.log(
    observationText
);

console.log(
    "SNAPSHOT",
    snapshot
);



        const observationReport =
    observationAgent.observe(
        disasterState
    );
    geminiObservationDisplay
    .textContent =
    "Backend Gemini integration pending";

const agentReport =
    observationAgent
        .generateAgentReport(
            disasterState,
            observationReport
        );

console.log(
    "Historical analysis temporarily disabled during architecture stabilization"
);

geminiObservationDisplay
    .textContent =
    "Backend integrations temporarily disabled";
console.log(
    "HISTORICAL SEARCH REPORT"
);

console.log(
    JSON.stringify(
        historicalSearchReport,
        null,
        2
    )
);
        

console.log(
    "AGENT REPORT"
);

console.log(
    JSON.stringify(
        agentReport,
        null,
        2
    )
);
     


trendDisplay.textContent =
    observationReport.trend;

summaryDisplay.textContent =
    observationReport.summary;

eventLogDisplay.innerHTML =
    observationReport.eventLog
        .slice()
        .reverse()
        .join("<br>");
eventDisplay.textContent =
    observationReport.events.length
    ? observationReport.events[
        observationReport.events.length - 1
      ]
    : "None";

console.log(
    "Observation Agent Report"
);

console.log(
    observationReport
);

if (
    observationReport.events.length
) {

    console.log(
        "Events:"
    );

    observationReport.events.forEach(
        event =>
            console.log(
                "•",
                event
            )
    );
}

        const recommendation =
            generateRecommendation(
                disasterState
            );

        waterDisplay.textContent =
            sensors.waterLevel
                .toFixed(1);

        riskDisplay.textContent =
            sensors.riskLevel;

        populationDisplay
            .textContent =
            sensors
                .affectedPopulation;

        recommendationDisplay
            .textContent =
            recommendation;

        recoveryDisplay
            .textContent =
            sensors.recoveryPhase
            ? "Yes"
            : "No";

        const currentDate =
            Cesium.JulianDate
                .toDate(
                    viewer.clock
                        .currentTime
                );

        timeDisplay.textContent =
            currentDate
                .toLocaleString();
    }
);
