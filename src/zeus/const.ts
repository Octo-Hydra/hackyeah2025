/* eslint-disable */

export const AllTypesProps: Record<string,any> = {
	UserRole: "enum" as const,
	ActiveJourneyInput:{
		segments:"PathSegmentInput"
	},
	PathSegmentInput:{
		from:"SegmentLocationInput",
		to:"SegmentLocationInput",
		transportType:"TransportType"
	},
	SegmentLocationInput:{
		coordinates:"CoordinatesInput"
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
		resolveReport:{

		},
		setActiveJourney:{
			input:"ActiveJourneyInput"
		},
		addFavoriteConnection:{
			input:"FavoriteConnectionInput"
		},
		removeFavoriteConnection:{

		}
	},
	IncidentKind: "enum" as const,
	TransportType: "enum" as const,
	ReportStatus: "enum" as const,
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
		name:"String",
		email:"String",
		role:"UserRole",
		reputation:"Int",
		activeJourney:"ActiveJourney"
	},
	ActiveJourney:{
		segments:"PathSegment",
		startTime:"String",
		expectedEndTime:"String"
	},
	FavoriteConnection:{
		id:"ID",
		name:"String",
		startStopId:"ID",
		endStopId:"ID"
	},
	OperationResult:{
		success:"Boolean",
		message:"String"
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
		register:"Boolean",
		verifyEmail:"Boolean",
		resendVerificationEmail:"Boolean",
		setup2FA:"TwoFactorSetup",
		verify2FA:"Boolean",
		disable2FA:"Boolean",
		createReport:"Incident",
		updateReport:"Incident",
		deleteReport:"Boolean",
		publishReport:"Incident",
		resolveReport:"Incident",
		setActiveJourney:"ActiveJourney",
		clearActiveJourney:"Boolean",
		addFavoriteConnection:"ID",
		removeFavoriteConnection:"Boolean"
	},
	Incident:{
		id:"ID",
		title:"String",
		description:"String",
		kind:"IncidentKind",
		status:"ReportStatus",
		lines:"Line",
		affectedSegment:"IncidentSegment",
		isFake:"Boolean",
		reportedBy:"ID",
		createdAt:"String"
	},
	IncidentSegment:{
		startStopId:"ID",
		endStopId:"ID",
		lineId:"ID"
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
		transportType:"TransportType"
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
		hasIncident:"Boolean"
	},
	JourneyPath:{
		segments:"PathSegment",
		totalDuration:"Int",
		departureTime:"String",
		arrivalTime:"String",
		warnings:"String",
		hasIncidents:"Boolean"
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