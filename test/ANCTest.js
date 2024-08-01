import {beforeEach, expect, it} from "@jest/globals";
import Anc from '../src/visitSchedules/anc';
import GrowthMonitoring from '../src/visitSchedules/growthMonitoring';
import EntityFactory from "./framework/EntityFactory";
import {RuleCondition, VisitScheduleBuilder} from "rules-config/rules";
import _ from "lodash";
import {afterMonths, dateAreEqual, firstOfNextMonth, today} from "./framework/DateUtil";
import {ModelGeneral} from "openchs-models";
import moment from "moment";

describe('Visit Scheduling', function () {
    let individual, anc, delivery, hbConcept, anmRecommendedMedicalFacilityInterventionConcept,
        requiresMedicalInterventionTreatmentConcept, highRiskConditionConcept, enrolment;

    beforeEach(() => {
        anc = EntityFactory.createEncounterType({name: "ANC"});
        delivery = EntityFactory.createEncounterType({name: "Delivery"});

        hbConcept = EntityFactory.createConcept({
            name: "Hb Value", uuid: '68bc6e51-eb49-4816-b78b-2427bbab8d92', dataType: "Numeric"
        });

        anmRecommendedMedicalFacilityInterventionConcept = EntityFactory.createCodedConceptWithAnswers("Did the ANM recommend for a medical facility intervention?", ['Yes', 'No']);
        requiresMedicalInterventionTreatmentConcept = EntityFactory.createCodedConceptWithAnswers("Is there a medical facillity intervention required for treatment?", ['Yes', 'No']);
        highRiskConditionConcept = EntityFactory.createCodedConceptWithAnswers("High risk condition", ['Tuberculosis', 'Age at marriage is less than 19 years', 'Age is greater than 35 years', 'Age is less than 18 years', 'Asthma', 'BMI less than 18.5', 'Diabetes/ Gestational Diabetes', 'Geographically high risk', 'Gravida 3 and Para 2', 'Gravida is more than or equal to 4', 'HB is less than 7 g/dL', 'Heart conditions', 'Height is less than 140cm', 'Hypertension', 'Hypothyroidism', 'Inadequate Weight Gain during Pregnancy', 'Inter-pregnancy interval is less than 24 months', 'Mild anemia', 'Moderate anemia', 'Obstetric History of Cesarean Section (LSCS)', 'Obstetric History of Congenital malformation', 'Obstetric History of Eclampsia', 'Obstetric History of HIV Positive', 'Obstetric History of Miscarriage/ Abortion', 'Obstetric History of Obstructed labour', 'Obstetric History of Postpartum Hemorrhage', 'Obstetric History of Premature Birth', 'Obstetric History of Still birth', 'Other pre-morbidity conditions', 'Pre-eclampsia', 'Red flag as per MCP card', 'Severe anemia', 'Sickle cell anemia', 'Syphillis', 'Thalassemia', 'Weight is less than 37kg']);
        individual = EntityFactory.createIndividual({name: "Test"});
    });

    function createAncObservations({hb, ancRecommendedMedical, highRiskCondition, requiresMedicalIntervention}) {
        const observations = [];
        if (!_.isNil(hb)) observations.push(EntityFactory.createObservation(hbConcept, hb));
        if (!_.isNil(ancRecommendedMedical)) observations.push(EntityFactory.createCodedObservation(anmRecommendedMedicalFacilityInterventionConcept, ancRecommendedMedical));
        if (!_.isNil(requiresMedicalIntervention)) observations.push(EntityFactory.createCodedObservation(requiresMedicalInterventionTreatmentConcept, requiresMedicalIntervention));
        if (!_.isNil(highRiskCondition)) observations.push(EntityFactory.createCodedObservation(highRiskConditionConcept, highRiskCondition));
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
            hb, ancRecommendedMedical, highRiskCondition, requiresMedicalIntervention
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
            params: params, imports: {
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
            hb, ancRecommendedMedical, highRiskCondition, requiresMedicalIntervention
        });
        EntityFactory.editProgramEncounter({
            programEncounter: visit, observations: observations, encounterDateTime: visit.encounterDateTime
        });
        return perform(visit);
    }

    function notScheduled(...visits) {
        visits.forEach(visit => expect(_.isNil(visit)).toBeTruthy());
    }

    function isScheduled(...visits) {
        visits.forEach(visit => expect(!_.isNil(visit)).toBeTruthy());
    }

    describe('ANC - Visit Scheduling', function () {
        beforeEach(() => {
            enrolment = EntityFactory.createEnrolment({
                observations: [], programExitDateTime: null,//moment(),
                individual, program: EntityFactory.createProgram({name: "Pregnancy"})
            });
        });

        it('Case - 1', function () {
            // Given
            const anc1 = ancVisit({
                hb: 11,
                ancRecommendedMedical: 'Yes',
                highRiskCondition: 'BMI less than 18.5',
                requiresMedicalIntervention: 'No'
            });
            scheduledANC({scheduledDate: firstOfNextMonth()});

            // When
            let {anc, pwHome} = editAnc(anc1, {hb: 12});

            // Then
            notScheduled(pwHome, anc);
        });

        it('Case - 2', function () {
            // When
            const {anc, pwHome, qrt} = perform(ancVisit({
                hb: 12, ancRecommendedMedical: 'No', highRiskCondition: null, requiresMedicalIntervention: 'No'
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
                hb: 12, ancRecommendedMedical: 'Yes', highRiskCondition: null, requiresMedicalIntervention: 'No'
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
        });
    });

    describe("Growth Monitoring - Visit Scheduling", function () {

        let individual, growthMonitoring, treatmentAdviceConcept, nutritionalStatusConcept, growthFalteringConcept,
            enrolment;

        individual = EntityFactory.createIndividual({name: "Test Child"});

        enrolment = EntityFactory.createEnrolment({
            observations: [], programExitDateTime: null,//moment(),
            individual, program: EntityFactory.createProgram({name: "Child"})
        });

        growthMonitoring = EntityFactory.createEncounterType({name: "Growth Monitoring"});

        treatmentAdviceConcept = EntityFactory.createCodedConceptWithAnswers("What is the treatment advise for the SAM/MAM/GF2 child?", ['Treatment at home', 'Referred to CHC', 'Any other higher facility/DH/MC']);

        nutritionalStatusConcept = EntityFactory.createConcept({name: "Nutritional Status",dataType: 'Text',uuid: '053b4f97-eacf-4f20-9d68-d6850966ce93'});

        growthFalteringConcept = EntityFactory.createConcept({name: "Growth Faltering",dataType: 'Text',uuid: 'a9d8db9a-8411-412c-82ed-e6e177353561'});

        function createGrowthMonitoringObservations({
                                                        treatmentAdvice, nutritionalStatus, growthFaltering
                                                    }) {
            const observations = [];
            if (!_.isNil(treatmentAdvice)) observations.push(EntityFactory.createCodedObservation(treatmentAdviceConcept, treatmentAdvice));
            if (!_.isNil(nutritionalStatus)) observations.push(EntityFactory.createObservation(nutritionalStatusConcept, nutritionalStatus));
            if (!_.isNil(growthFaltering)) observations.push(EntityFactory.createObservation(growthFalteringConcept, growthFaltering));
            return observations;
        }

        function growthMonitoringVisit({
                                           treatmentAdvice,
                                           nutritionalStatus,
                                           growthFaltering,
                                           encounterDate = new Date()
                                       }) {
            const observations = createGrowthMonitoringObservations({
                treatmentAdvice, nutritionalStatus, growthFaltering,
            });
            return EntityFactory.createProgramEncounter({
                uuid: ModelGeneral.randomUUID(),
                encounterType: growthMonitoring,
                programEnrolment: enrolment,
                observations: observations,
                encounterDateTime: encounterDate
            });
        }

        function scheduledGrowthMonitoring({scheduledDate}) {
            return EntityFactory.createProgramEncounter({
                encounterType: growthMonitoring,
                programEnrolment: enrolment,
                encounterDateTime: null,
                earliestDateTime: scheduledDate,
                observations: []
            });
        }

        function editGrowthMonitoring(visit, {
            hb, ancRecommendedMedical, highRiskCondition, requiresMedicalIntervention
        }) {
            const observations = cre({
                treatmentAdvice, nutritionalStatus, growthFaltering
            });
            EntityFactory.editProgramEncounter({
                programEncounter: visit, observations: observations, encounterDateTime: visit.encounterDateTime
            });
            return performGM(visit);
        }

        function performGM(visit) {
            const params = {entity: visit};
            const scheduledVisits = GrowthMonitoring({
                params: params, imports: {
                    rulesConfig: {VisitScheduleBuilder: VisitScheduleBuilder, RuleCondition: RuleCondition},
                    moment: require('moment'),
                    lodash: require('lodash')
                }
            });
            console.log(scheduledVisits);
            return {
                growthMonitoring: _.find(scheduledVisits, (visit) => visit.encounterType === 'Growth Monitoring'),
                qrtChild: _.find(scheduledVisits, (visit) => visit.encounterType === 'QRT Child'),
                childHomeVisit: _.find(scheduledVisits, (visit) => visit.encounterType === 'Child Home Visit')
            };
        }


        it('Case - 1', function () {
            // When
            const {growthMonitoring,qrtChild,childHomeVisit} = performGM(growthMonitoringVisit({
                treatmentAdvice: 'Treatment at home',//Any option selected
                nutritionalStatus: 'SAM',
                growthFaltering: 'GF1',
                encounterDate: today()
            }));
            // Then
            dateAreEqual(growthMonitoring.earliestDate, firstOfNextMonth());
            dateAreEqual(qrtChild.earliestDate,today());
        });

        it('Case - 2', function () {
            // When
            const {growthMonitoring,qrtChild,childHomeVisit} = performGM(growthMonitoringVisit({
                treatmentAdvice: 'Treatment at home',//Any option selected
                nutritionalStatus: 'SAM',
                growthFaltering: 'GF2',
                encounterDate: today()
            }));
            // Then
            dateAreEqual(growthMonitoring.earliestDate, firstOfNextMonth());
            dateAreEqual(qrtChild.earliestDate,today());
        });

        it('Case - 3', function () {
            // When
            const {growthMonitoring,qrtChild,childHomeVisit} = performGM(growthMonitoringVisit({
                treatmentAdvice: 'Treatment at home',//Any option selected
                nutritionalStatus: 'SAM',
                growthFaltering: 'None',
                encounterDate: today()
            }));
            // Then
            dateAreEqual(growthMonitoring.earliestDate, firstOfNextMonth());
            dateAreEqual(qrtChild.earliestDate,today());
        });

        it('Case - 4', function () {
            // When
            const {growthMonitoring,qrtChild,childHomeVisit} = performGM(growthMonitoringVisit({
                treatmentAdvice: 'Referred to CHC', //Any other Higher facility/DH/MC
                nutritionalStatus: 'MAM',
                growthFaltering: 'GF2',
                encounterDate: today()
            }));
            // Then
            dateAreEqual(growthMonitoring.earliestDate, firstOfNextMonth());
            dateAreEqual(qrtChild.earliestDate,today());
        });

        it('Case - 5', function () {
            // When
            const {growthMonitoring,qrtChild,childHomeVisit} = performGM(growthMonitoringVisit({
                treatmentAdvice: 'Treatment at home',
                nutritionalStatus: 'MAM',
                growthFaltering: 'GF2',
                encounterDate: today()
            }));
            // Then
            dateAreEqual(growthMonitoring.earliestDate, firstOfNextMonth());
            dateAreEqual(childHomeVisit.earliestDate, moment().add(15, 'days').toDate());
        });

        it('Case - 6', function () {
            // When
            const {growthMonitoring,qrtChild,childHomeVisit} = performGM(growthMonitoringVisit({
                treatmentAdvice: 'Treatment at home',
                nutritionalStatus: 'MAM',
                growthFaltering: 'GF1',
                encounterDate: today()
            }));
            // Then
            dateAreEqual(growthMonitoring.earliestDate, firstOfNextMonth());
            dateAreEqual(childHomeVisit.earliestDate, moment().add(15, 'days').toDate());
        });

        it('Case - 7', function () {
            // When
            const {growthMonitoring,qrtChild,childHomeVisit} = performGM(growthMonitoringVisit({
                treatmentAdvice: 'Referred to CHC', //Any other Higher facility/DH/MC
                nutritionalStatus: 'MAM',
                growthFaltering: 'None',
                encounterDate: today()
            }));
            // Then
            dateAreEqual(growthMonitoring.earliestDate, firstOfNextMonth());
            dateAreEqual(qrtChild.earliestDate, today());
        });

        it('Case - 8', function () {
            // When
            const {growthMonitoring,qrtChild,childHomeVisit} = performGM(growthMonitoringVisit({
                treatmentAdvice: 'Referred to CHC', //Any other Higher facility/DH/MC
                nutritionalStatus: 'Normal',
                growthFaltering: 'GF1',
                encounterDate: today()
            }));
            // Then
            dateAreEqual(growthMonitoring.earliestDate, firstOfNextMonth());
            dateAreEqual(qrtChild.earliestDate, today());
        });

        it('Case - 9', function () {
            // When
            const {growthMonitoring,qrtChild,childHomeVisit} = performGM(growthMonitoringVisit({
                treatmentAdvice: 'Treatment at home',
                nutritionalStatus: 'Normal',
                growthFaltering: 'GF1',
                encounterDate: today()
            }));
            // Then
            dateAreEqual(growthMonitoring.earliestDate, firstOfNextMonth());
            dateAreEqual(childHomeVisit.earliestDate, moment().add(15, 'days').toDate());
        });

        it('Case - 10', function () {
            // When
            const {growthMonitoring,qrtChild,childHomeVisit} = performGM(growthMonitoringVisit({
                treatmentAdvice: 'Referred to CHC', //Any other Higher facility/DH/MC
                nutritionalStatus: 'Normal',
                growthFaltering: 'GF2',
                encounterDate: today()
            }));
            // Then
            dateAreEqual(growthMonitoring.earliestDate, firstOfNextMonth());
            dateAreEqual(qrtChild.earliestDate, today());
        });

        it('Case - 11', function () {
            // When
            const {growthMonitoring,qrtChild,childHomeVisit} = performGM(growthMonitoringVisit({
                treatmentAdvice: null,
                nutritionalStatus: 'Normal',
                growthFaltering: 'None',
                encounterDate: today()
            }));
            // Then

        });
    });
});
