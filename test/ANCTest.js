import {beforeEach, expect, it} from "@jest/globals";
import Anc from '../src/visitSchedules/anc';
import EntityFactory from "./framework/EntityFactory";
import {RuleCondition, VisitScheduleBuilder} from "rules-config/rules";
import _ from "lodash";
import {afterMonths, dateAreEqual, firstOfNextMonth, today} from "./framework/DateUtil";
import {ModelGeneral} from "openchs-models";

describe('ANC', function () {
    let individual, anc, delivery, hbConcept, anmRecommendedMedicalFacilityInterventionConcept,
        requiresMedicalInterventionTreatmentConcept, highRiskConditionConcept,
        enrolment;

    beforeEach(() => {
        anc = EntityFactory.createEncounterType({name: "ANC"});
        delivery = EntityFactory.createEncounterType({name: "Delivery"});

        hbConcept = EntityFactory.createConcept({
            name: "Hb Value",
            uuid: '68bc6e51-eb49-4816-b78b-2427bbab8d92',
            dataType: "Numeric"
        });

        anmRecommendedMedicalFacilityInterventionConcept = EntityFactory.createCodedConceptWithAnswers(
            "Did the ANM recommend for a medical facility intervention?",
            ['Yes', 'No']
        );
        requiresMedicalInterventionTreatmentConcept = EntityFactory.createCodedConceptWithAnswers(
            "Is there a medical facillity intervention required for treatment?",
            ['Yes', 'No']
        );
        highRiskConditionConcept = EntityFactory.createCodedConceptWithAnswers(
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

        individual = EntityFactory.createIndividual({name: "Test"});
        enrolment = EntityFactory.createEnrolment({
            observations: [],
            programExitDateTime: null,//moment(),
            individual,
            program: EntityFactory.createProgram({name: "Pregnancy"})
        });

    });

    function createAncObservations({hb, ancRecommendedMedical, highRiskCondition, requiresMedicalIntervention}) {
        const observations = [];
        if (!_.isNil(hb))
            observations.push(EntityFactory.createObservation(hbConcept, hb));
        if (!_.isNil(ancRecommendedMedical))
            observations.push(EntityFactory.createCodedObservation(anmRecommendedMedicalFacilityInterventionConcept, ancRecommendedMedical));
        if (!_.isNil(requiresMedicalIntervention))
            observations.push(EntityFactory.createCodedObservation(requiresMedicalInterventionTreatmentConcept, requiresMedicalIntervention));
        if (!_.isNil(highRiskCondition))
            observations.push(EntityFactory.createCodedObservation(highRiskConditionConcept, highRiskCondition));
        return observations;
    }

    function ancVisit({
                          hb,
                          ancRecommendedMedical,
                          highRiskCondition,
                          requiresMedicalIntervention,
                          encounterDate = new Date()
                      }) {
        const observations = createAncObservations({
            hb,
            ancRecommendedMedical,
            highRiskCondition,
            requiresMedicalIntervention
        });
        return EntityFactory.createProgramEncounter({
            uuid: ModelGeneral.randomUUID(),
            encounterType: anc,
            programEnrolment: enrolment,
            observations: observations,
            encounterDateTime: encounterDate
        });
    }

    function scheduledANC({scheduledDate}) {
        return EntityFactory.createProgramEncounter({
            encounterType: anc,
            programEnrolment: enrolment,
            encounterDateTime: null,
            earliestDateTime: scheduledDate,
            observations: []
        });
    }

    function scheduledDelivery({scheduledDate, encounterDate}) {
        return EntityFactory.createProgramEncounter({
            encounterType: delivery,
            programEnrolment: enrolment,
            encounterDateTime: encounterDate,
            earliestDateTime: scheduledDate,
            observations: []
        });
    }

    function perform(visit) {
        const params = {entity: visit};
        const scheduledVisits = Anc({
            params: params,
            imports: {
                rulesConfig: {VisitScheduleBuilder: VisitScheduleBuilder, RuleCondition: RuleCondition},
                moment: require('moment'),
                lodash: require('lodash')
            }
        });
        console.log(scheduledVisits);
        return {
            anc: _.find(scheduledVisits, (visit) => visit.encounterType === 'ANC'),
            pwHome: _.find(scheduledVisits, (visit) => visit.encounterType === 'PW Home Visit'),
            qrt: _.find(scheduledVisits, (visit) => visit.encounterType === 'QRT PW')
        };
    }

    function editAnc(visit, {hb, ancRecommendedMedical, highRiskCondition, requiresMedicalIntervention}) {
        const observations = createAncObservations({
            hb,
            ancRecommendedMedical,
            highRiskCondition,
            requiresMedicalIntervention
        });
        EntityFactory.editProgramEncounter({
            programEncounter: visit,
            observations: observations,
            encounterDateTime: visit.encounterDateTime
        });
        return perform(visit);
    }

    function notScheduled(...visits) {
        visits.forEach(visit => expect(_.isNil(visit)).toBeTruthy());
    }

    it('Case - 1', function () {
        // Given
        scheduledANC({scheduledDate: firstOfNextMonth()});
        const anc1 = ancVisit({
            hb: 11,
            ancRecommendedMedical: 'Yes',
            highRiskCondition: 'BMI less than 18.5',
            requiresMedicalIntervention: 'No'
        });

        // When
        const {anc, pwHome, qrt} = editAnc(anc1, {hb: 12});

        // Then
        notScheduled(pwHome, anc);
    });

    it('Case - 2', function () {
        // When
        const {anc, pwHome, qrt} = perform(ancVisit({
            hb: 12,
            ancRecommendedMedical: 'No',
            highRiskCondition: null,
            requiresMedicalIntervention: 'No'
        }));

        // Then
        notScheduled(pwHome, qrt);
        dateAreEqual(anc.earliestDate, firstOfNextMonth());
    });

    it('Case - 3', function () {
        // Given
        const anc1 = ancVisit({
            hb: 11,
            ancRecommendedMedical: 'No',
            highRiskCondition: 'BMI less than 18.5',
            requiresMedicalIntervention: 'No'
        });

        // When
        const {anc, pwHome, qrt} = editAnc(anc1, {});

        // Then
        notScheduled(qrt, pwHome);
        dateAreEqual(anc.earliestDate, firstOfNextMonth());
    });

    it('Case - 4', function () {

        //When
        const {anc, pwHome, qrt} = perform(ancVisit({
            hb: 12,
            ancRecommendedMedical: 'No',
            highRiskCondition: 'Age at marriage is less than 19 years',
            requiresMedicalIntervention: 'Yes'
        }));

        //Then
        dateAreEqual(anc.earliestDate, firstOfNextMonth());
        dateAreEqual(qrt.earliestDate, today());
    });

    it('Case - 5', function () {

        //When
        const {anc, pwHome, qrt} = perform(ancVisit({
            hb: 6,
            ancRecommendedMedical: 'No',
            highRiskCondition: 'HB is less than 7 g/dL',
            requiresMedicalIntervention: 'Yes'
        }));

        // Then
        dateAreEqual(anc.earliestDate, firstOfNextMonth());
        dateAreEqual(qrt.earliestDate, today());
    });

    it('Case - 6', function () {
        // When
        const {anc, pwHome, qrt} = perform(ancVisit({
            hb: 6,
            ancRecommendedMedical: 'Yes',
            highRiskCondition: 'HB is less than 7 g/dL',
            requiresMedicalIntervention: 'Yes'
        }));

        // Then
        dateAreEqual(anc.earliestDate, firstOfNextMonth());
        dateAreEqual(qrt.earliestDate, today());
    });

    it('Case - 7', function () {
        // When
        const {anc, pwHome, qrt} = perform(ancVisit({
            hb: 12,
            ancRecommendedMedical: 'Yes',
            highRiskCondition: null,
            requiresMedicalIntervention: 'No'
        }));
        //Then
        dateAreEqual(anc.earliestDate, firstOfNextMonth());
        dateAreEqual(qrt.earliestDate, today());
    });

    it('Case - 8', function () {
        // When
        const {anc, pwHome, qrt} = perform(ancVisit({
            hb: 5,
            ancRecommendedMedical: 'Yes',
            highRiskCondition: 'HB is less than 7 g/dL' || 'Age at marriage is less than 19 years',
            requiresMedicalIntervention: 'No'
        }));
        // Then
        dateAreEqual(anc.earliestDate, firstOfNextMonth());
        dateAreEqual(qrt.earliestDate, today());
    });

    it('Case - 9', function () {
        // When
        scheduledDelivery({scheduledDate: afterMonths(7), encounterDate: today()});
        const {anc, pwHome, qrt} = perform(ancVisit({
            hb: 5,
            ancRecommendedMedical: 'Yes',
            highRiskCondition: 'HB is less than 7 g/dL' || 'Age at marriage is less than 19 years',
            requiresMedicalIntervention: 'Yes'
        }));
        // Then
        notScheduled(anc, pwHome, qrt);
    })
});




