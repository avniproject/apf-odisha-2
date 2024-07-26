import Anc from '../src/visitSchedules/anc';
import EntityFactory from "./framework/EntityFactory";
import {VisitScheduleBuilder, RuleCondition} from "rules-config/rules";
import moment from "moment";

it('should ', function () {
    const anc = EntityFactory.createEncounterType({name: "ANC"});
    const delivery = EntityFactory.createEncounterType({name: "Delivery"});
    const individual = EntityFactory.createIndividual({name: "Test"});

    const hbConcept = EntityFactory.createConcept({
        name: "Hb Value",
        uuid: '68bc6e51-eb49-4816-b78b-2427bbab8d92',
        dataType: "Numeric"
    });
    const anmRecommendedMedicalFacilityInterventionConcept = EntityFactory.createCodedConceptWithAnswers(
        "Did the ANM recommend for a medical facility intervention?",
        ['Yes', 'No']
    );
    const requiresMedicalInterventionTreatmentConcept = EntityFactory.createCodedConceptWithAnswers(
        "Is there a medical facillity intervention required for treatment?",
        ['Yes', 'No']
    );
    const highRiskConditionConcept = EntityFactory.createCodedConceptWithAnswers(
        "High risk condition",
        ['Tuberculosis',
            'Age at marriage is less than 19 years',
            'Age is greater than 35 years',
            'Age is less than 18 years',
            'Asthma',
            'BMI less than 18.5',
            'Diabetes/ Gestational Diabetes',
            'Geographically high risk',
            'Gravida 3 and Para 2',
            'Gravida is more than or equal to 4',
            'HB is less than 7 g/dL',
            'Heart conditions',
            'Height is less than 140cm',
            'Hypertension',
            'Hypothyroidism',
            'Inadequate Weight Gain during Pregnancy',
            'Inter-pregnancy interval is less than 24 months',
            'Mild anemia',
            'Moderate anemia',
            'Obstetric History of Cesarean Section (LSCS)',
            'Obstetric History of Congenital malformation',
            'Obstetric History of Eclampsia',
            'Obstetric History of HIV Positive',
            'Obstetric History of Miscarriage/ Abortion',
            'Obstetric History of Obstructed labour',
            'Obstetric History of Postpartum Hemorrhage',
            'Obstetric History of Premature Birth',
            'Obstetric History of Still birth',
            'Other pre-morbidity conditions',
            'Pre-eclampsia',
            'Red flag as per MCP card',
            'Severe anemia',
            'Sickle cell anemia',
            'Syphillis',
            'Thalassemia',
            'Weight is less than 37kg'
        ]
    )

    const enrolment = EntityFactory.createEnrolment({
        observations: [],
        programExitDateTime: null,//moment(),
        individual,
        program: EntityFactory.createProgram({name: "Pregnancy"})
    });

    const programEncounter = EntityFactory.createProgramEncounter({
        encounterType: anc,
        programEnrolment: enrolment,
        observations: [EntityFactory.createObservation(hbConcept, 12),
            EntityFactory.createCodedObservation(anmRecommendedMedicalFacilityInterventionConcept, 'Yes'),
            EntityFactory.createCodedObservation(requiresMedicalInterventionTreatmentConcept, 'No'),
            EntityFactory.createCodedObservation(highRiskConditionConcept, 'BMI less than 18.5')]
    });

    const nextDate = moment(programEncounter.earliestVisitDateTime).add(1, 'M').startOf('month').toDate();
    const anc1Encounter = EntityFactory.createProgramEncounter({
        encounterType: anc,
        programEnrolment: enrolment,
        encounterDateTime: null,
        earliestDateTime: nextDate,
        observations: []
    });

    const deliveryEncounter = EntityFactory.createProgramEncounter({
        encounterType: delivery,
        programEnrolment: enrolment,
        encounterDateTime: null,
        observations: []
    });

    const params = {entity: programEncounter, deliveryEncounter, anc1Encounter};
    const scheduleBuilder = Anc({
        params: params,
        imports: {
            rulesConfig: {VisitScheduleBuilder: VisitScheduleBuilder, RuleCondition: RuleCondition},
            moment: require('moment'),
            lodash: require('lodash')
        }
    });
    console.log(scheduleBuilder);

    const ancEarliestDate = moment(programEncounter.earliestVisitDateTime).add(1, 'M').startOf('month').toDate();
    const maxVisitDate = moment(ancEarliestDate).endOf('month').toDate();

    const pwEarliestDate = moment(programEncounter.earliestVisitDateTime).add(1, 'M').startOf('month').toDate();
    const pwMaxVisitDate = moment(pwEarliestDate).add(7, 'days').toDate()


    expect(scheduleBuilder).toMatchSnapshot(
        [
            {
                name: 'ANC',
                encounterType: 'ANC',
                earliestDate: ancEarliestDate,
                maxDate: maxVisitDate
            },
            {
                name: 'PW Home Visit',
                encounterType: 'PW Home Visit',
                earliestDate: pwEarliestDate,
                maxDate: pwMaxVisitDate
            }
        ]
    )

});

