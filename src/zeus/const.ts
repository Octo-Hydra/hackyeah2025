/* eslint-disable */

export const AllTypesProps: Record<string,any> = {
	UserRole: "enum" as const,
	Query:{
		check2FAStatus:{

		}
	},
	RegisterInput:{

	},
	Mutation:{
		register:{
			input:"RegisterInput"
		},
		verifyEmail:{

		},
		resendVerificationEmail:{

		},
		verify2FA:{

		}
	},
	carrierMutation:{
		createReport:{
			input:"CreateReportInput"
		},
		saveDraft:{
			input:"CreateReportInput"
		},
		updateReport:{
			input:"UpdateReportInput"
		},
		deleteReport:{

		},
		publishReport:{

		}
	},
	IncidentKind: "enum" as const,
	TransportType: "enum" as const,
	IncidentClass: "enum" as const,
	ReportStatus: "enum" as const,
	CreateReportInput:{
		kind:"IncidentKind",
		status:"ReportStatus"
	},
	UpdateReportInput:{
		kind:"IncidentKind",
		status:"ReportStatus"
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
		twoFactorEnabled:"Boolean"
	},
	TwoFactorSetup:{
		secret:"String",
		qrCode:"String"
	},
	TwoFactorStatus:{
		requires2FA:"Boolean",
		userExists:"Boolean"
	},
	TwoFactorResult:{
		success:"Boolean",
		message:"String"
	},
	Query:{
		me:"User",
		check2FAStatus:"TwoFactorStatus",
		userQuery:"UserQuery"
	},
	RegisterResult:{
		success:"Boolean",
		message:"String",
		userId:"String"
	},
	VerifyEmailResult:{
		success:"Boolean",
		message:"String"
	},
	ResendVerificationResult:{
		success:"Boolean",
		message:"String"
	},
	Mutation:{
		register:"RegisterResult",
		verifyEmail:"VerifyEmailResult",
		resendVerificationEmail:"ResendVerificationResult",
		setup2FA:"TwoFactorSetup",
		verify2FA:"TwoFactorResult",
		disable2FA:"TwoFactorResult",
		carrierMutations:"carrierMutation"
	},
	carrierMutation:{
		createReport:"Incident",
		saveDraft:"Incident",
		updateReport:"Incident",
		deleteReport:"DeleteResult",
		publishReport:"Incident"
	},
	Incident:{
		id:"ID",
		title:"String",
		description:"String",
		kind:"IncidentKind",
		incidentClass:"IncidentClass",
		status:"ReportStatus",
		lines:"Line",
		createdBy:"User",
		createdAt:"String",
		updatedAt:"String"
	},
	Line:{
		id:"ID",
		name:"String",
		transportType:"TransportType"
	},
	DeleteResult:{
		success:"Boolean",
		message:"String"
	},
	UserQuery:{
		dupa:"String"
	},
	Subscription:{
		_empty:"String"
	},
	ID: `scalar.ID` as const
}

export const Ops = {
query: "Query" as const,
	mutation: "Mutation" as const,
	subscription: "Subscription" as const
}