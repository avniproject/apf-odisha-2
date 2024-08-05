import {beforeEach, expect, it} from "@jest/globals";
import GrowthMonitoring from '../src/visitSchedules/growthMonitoring';
import EntityFactory from "./framework/EntityFactory";
import {RuleCondition, VisitScheduleBuilder} from "rules-config/rules";
import _ from "lodash";
import {afterMonths, age, dateAreEqual, firstOfNextMonth, today} from "./framework/DateUtil";
import {ModelGeneral} from "openchs-models";
import moment from "moment";
import {notScheduled} from "./framework/VisitScheduleUtil";


    describe("Growth Monitoring - Visit Scheduling", function () {
        let individual, growthMonitoring, treatmentAdviceConcept, nutritionalStatusConcept, growthFalteringConcept,
            enrolment;

        beforeEach(() => {
            growthMonitoring = EntityFactory.createEncounterType({name: "Growth Monitoring"});

            treatmentAdviceConcept = EntityFactory.createCodedConceptWithAnswers("What is the treatment advise for the SAM/MAM/GF2 child?", ['Treatment at home', 'Referred to CHC', 'Any other higher facility/DH/MC']);
            nutritionalStatusConcept = EntityFactory.createConcept({name: "Nutritional Status", dataType: 'Text', uuid: '053b4f97-eacf-4f20-9d68-d6850966ce93'});
            growthFalteringConcept = EntityFactory.createConcept({name: "Growth Faltering", dataType: 'Text', uuid: 'a9d8db9a-8411-412c-82ed-e6e177353561'});

            individual = EntityFactory.createIndividual({name: "Test Child"});
            enrolment = EntityFactory.createEnrolment({
                observations: [], programExitDateTime: null,//moment(),
                individual, program: EntityFactory.createProgram({name: "Child"})
            });
        });

        function enrolledChild(age) {
            individual = EntityFactory.createIndividual({name: "Test Child", age: age});
            enrolment = EntityFactory.createEnrolment({
                observations: [], programExitDateTime: null,//moment(),
                individual, program: EntityFactory.createProgram({name: "Child"})
            });
        }

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
            // Given
            enrolledChild(age({years: 2}));

            // When
            const {growthMonitoring, qrtChild, childHomeVisit} = performGM(growthMonitoringVisit({
                treatmentAdvice: 'Treatment at home',//Any option selected
                nutritionalStatus: 'SAM',
                growthFaltering: 'GF1',
                encounterDate: today()
            }));
            // Then
            dateAreEqual(growthMonitoring.earliestDate, firstOfNextMonth());
            dateAreEqual(qrtChild.earliestDate, today());
        });

        it('Case - 2', function () {
            // Given
            enrolledChild(age({years: 5.1}));

            // When
            const {growthMonitoring, qrtChild, childHomeVisit} = performGM(growthMonitoringVisit({
                treatmentAdvice: 'Treatment at home',//Any option selected
                nutritionalStatus: 'SAM',
                growthFaltering: 'GF2',
                encounterDate: today()
            }));
            // Then
            notScheduled(growthMonitoring, qrtChild, childHomeVisit);
        });

        it('Case - 3', function () {
            // Given
            enrolledChild(age({years: 2}));

            // When
            const {growthMonitoring, qrtChild, childHomeVisit} = performGM(growthMonitoringVisit({
                treatmentAdvice: 'Treatment at home',//Any option selected
                nutritionalStatus: 'SAM',
                growthFaltering: 'None',
                encounterDate: today()
            }));
            // Then
            dateAreEqual(growthMonitoring.earliestDate, firstOfNextMonth());
            dateAreEqual(qrtChild.earliestDate, today());
        });

        it('Case - 4', function () {
            // Given
            enrolledChild(age({years: 2}));

            // When
            const {growthMonitoring, qrtChild, childHomeVisit} = performGM(growthMonitoringVisit({
                treatmentAdvice: 'Referred to CHC', //Any other Higher facility/DH/MC
                nutritionalStatus: 'MAM',
                growthFaltering: 'GF2',
                encounterDate: today()
            }));
            // Then
            dateAreEqual(growthMonitoring.earliestDate, firstOfNextMonth());
            dateAreEqual(qrtChild.earliestDate, today());
        });

        it('Case - 5', function () {
            // Given
            enrolledChild(age({years: 2}));

            // When
            const {growthMonitoring, qrtChild, childHomeVisit} = performGM(growthMonitoringVisit({
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
            // Given
            enrolledChild(age({years: 2}));

            // When
            const {growthMonitoring, qrtChild, childHomeVisit} = performGM(growthMonitoringVisit({
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
            // Given
            enrolledChild(age({years: 2}));

            // When
            const {growthMonitoring, qrtChild, childHomeVisit} = performGM(growthMonitoringVisit({
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
            // Given
            enrolledChild(age({years: 2}));

            // When
            const {growthMonitoring, qrtChild, childHomeVisit} = performGM(growthMonitoringVisit({
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
            // Given
            enrolledChild(age({years: 2}));

            // When
            const {growthMonitoring, qrtChild, childHomeVisit} = performGM(growthMonitoringVisit({
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
            // Given
            enrolledChild(age({years: 2}));

            // When
            const {growthMonitoring, qrtChild, childHomeVisit} = performGM(growthMonitoringVisit({
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
            // Given
            enrolledChild(age({years: 2}));

            // When
            const {growthMonitoring, qrtChild, childHomeVisit} = performGM(growthMonitoringVisit({
                treatmentAdvice: null,
                nutritionalStatus: 'Normal',
                growthFaltering: 'None',
                encounterDate: today()
            }));
            // Then

        });
    });

