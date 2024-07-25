import Anc from '../src/visitSchedules/anc';
import EntityFactory from "./framework/EntityFactory";
import {VisitScheduleBuilder, RuleCondition} from "rules-config/rules";

it('should ', function () {
    const anc = EntityFactory.createEncounterType({name: "ANC"});
    const individual = EntityFactory.createIndividual({name: "Test"});
    const enrolment = EntityFactory.createEnrolment({
        observations: [],
        individual,
        program: EntityFactory.createProgram({name: "Pregnancy"})
    });
    const hbConcept = EntityFactory.createConcept({name: "Hb Value", uuid: '68bc6e51-eb49-4816-b78b-2427bbab8d92', dataType: "Numeric"});

    const anmRecommendedMedicalFacilityInterventionConcept = EntityFactory.createCodedConceptWithAnswers(
        "Did the ANM recommend for a medical facility intervention?",
        ['Yes', 'No']
    );
    const programEncounter = EntityFactory.createProgramEncounter({
        encounterType: anc,
        programEnrolment: enrolment,
        observations: [EntityFactory.createObservation(hbConcept, 12),
             EntityFactory.createCodedObservation(anmRecommendedMedicalFacilityInterventionConcept, 'Yes')]
    });

    const params = {entity: programEncounter};
    const scheduleBuilder = Anc({
        params: params,
        imports: {rulesConfig: {VisitScheduleBuilder: VisitScheduleBuilder, RuleCondition: RuleCondition}, moment: require('moment'), lodash: require('lodash')}
    });
    console.log(scheduleBuilder);
});
