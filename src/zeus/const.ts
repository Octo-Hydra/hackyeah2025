/* eslint-disable */

export const AllTypesProps: Record<string,any> = {
	UserRole: "enum" as const,
	ActiveJourneyInput:{

	},
	FavoriteConnectionInput:{

	},
	Query:{
		incidentsByLine:{
			transportType:"TransportType"
		},
		lines:{
			transportType:"TransportType"
		},
		stops:{
			transportType:"TransportType"
		},
		findPath:{
			input:"FindPathInput"
		}
	},
	Mutation:{
		register:{

		},
		verifyEmail:{

		},
		resendVerificationEmail:{

		},
		verify2FA:{

		},
		createReport:{
			input:"CreateReportInput"
		},
		updateReport:{
			input:"UpdateReportInput"
		},
		deleteReport:{

		},
		publishReport:{

		},
		setActiveJourney:{
			input:"ActiveJourneyInput"
		},
		addFavoriteConnection:{
			input:"FavoriteConnectionInput"
		},
		removeFavoriteConnection:{

		},
		updateFavoriteConnection:{
			input:"FavoriteConnectionInput"
		}
	},
	IncidentKind: "enum" as const,
	TransportType: "enum" as const,
	IncidentClass: "enum" as const,
	ReportStatus: "enum" as const,
	SegmentConfidence: "enum" as const,
	CreateReportInput:{
		kind:"IncidentKind",
		status:"ReportStatus",
		reporterLocation:"CoordinatesInput"
	},
	UpdateReportInput:{
		kind:"IncidentKind",
		status:"ReportStatus"
	},
	CoordinatesInput:{

	},
	IncidentSeverity: "enum" as const,
	FindPathInput:{
		from:"CoordinatesInput",
		to:"CoordinatesInput"
	},
	Subscription:{
		incidentCreated:{
			transportType:"TransportType"
		},
		incidentUpdated:{
			transportType:"TransportType"
		},
		lineIncidentUpdates:{

		},
		myLinesIncidents:{

		}
	},
	ID: `scalar.ID` as const
}

export const ReturnTypes: Record<string,any> = {
	User:{
		id:"ID",
		createdAt:"String",
		updatedAt:"String",
		name:"String",
		email:"String",
		role:"UserRole",
		twoFactorEnabled:"Boolean",
		reputation:"Int",
		activeJourney:"ActiveJourney",
		favoriteConnections:"FavoriteConnection"
	},
	ActiveJourney:{
		routeIds:"ID",
		lineIds:"ID",
		startStopId:"ID",
		endStopId:"ID",
		startTime:"String",
		expectedEndTime:"String",
		notifiedIncidentIds:"ID"
	},
	FavoriteConnection:{
		id:"ID",
		name:"String",
		routeIds:"ID",
		lineIds:"ID",
		startStopId:"ID",
		endStopId:"ID",
		notifyAlways:"Boolean",
		createdAt:"String"
	},
	OperationResult:{
		success:"Boolean",
		message:"String",
		data:"String"
	},
	TwoFactorSetup:{
		secret:"String",
		qrCode:"String"
	},
	Query:{
		me:"User",
		incidentsByLine:"Incident",
		lines:"Line",
		stops:"Stop",
		findPath:"JourneyPath"
	},
	Mutation:{
		register:"OperationResult",
		verifyEmail:"OperationResult",
		resendVerificationEmail:"OperationResult",
		setup2FA:"TwoFactorSetup",
		verify2FA:"OperationResult",
		disable2FA:"OperationResult",
		createReport:"Incident",
		updateReport:"Incident",
		deleteReport:"OperationResult",
		publishReport:"Incident",
		setActiveJourney:"User",
		clearActiveJourney:"User",
		addFavoriteConnection:"FavoriteConnection",
		removeFavoriteConnection:"OperationResult",
		updateFavoriteConnection:"FavoriteConnection"
	},
	Incident:{
		id:"ID",
		title:"String",
		description:"String",
		kind:"IncidentKind",
		incidentClass:"IncidentClass",
		status:"ReportStatus",
		lines:"Line",
		reporterLocation:"Coordinates",
		affectedSegment:"IncidentSegment",
		createdBy:"User",
		createdAt:"String",
		updatedAt:"String"
	},
	IncidentSegment:{
		startStopId:"ID",
		endStopId:"ID",
		lineId:"ID",
		confidence:"SegmentConfidence"
	},
	Line:{
		id:"ID",
		name:"String",
		transportType:"TransportType"
	},
	Coordinates:{
		latitude:"Float",
		longitude:"Float"
	},
	Stop:{
		id:"ID",
		name:"String",
		coordinates:"Coordinates",
		transportType:"TransportType",
		platformNumbers:"String"
	},
	SegmentLocation:{
		stopId:"ID",
		stopName:"String",
		coordinates:"Coordinates"
	},
	PathSegment:{
		from:"SegmentLocation",
		to:"SegmentLocation",
		lineId:"ID",
		lineName:"String",
		transportType:"TransportType",
		departureTime:"String",
		arrivalTime:"String",
		duration:"Int",
		distance:"Int",
		platformNumber:"String",
		hasIncident:"Boolean",
		incidentWarning:"String",
		incidentSeverity:"IncidentSeverity"
	},
	JourneyPath:{
		segments:"PathSegment",
		totalDuration:"Int",
		totalTransfers:"Int",
		departureTime:"String",
		arrivalTime:"String",
		warnings:"String",
		hasIncidents:"Boolean",
		affectedSegments:"Int"
	},
	Subscription:{
		incidentCreated:"Incident",
		incidentUpdated:"Incident",
		lineIncidentUpdates:"Incident",
		myLinesIncidents:"Incident"
	},
	ID: `scalar.ID` as const
}

export const Ops = {
query: "Query" as const,
	mutation: "Mutation" as const,
	subscription: "Subscription" as const
}