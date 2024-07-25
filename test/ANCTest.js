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
    // const anmRecommendedMedicalFacilityInterventionConcept = EntityFactory.createConcept({name: "Did the ANM recommend for a medical facility intervention?", uuid: 'f7cc4fd5-5c66-4695-b5e3-1d83c3621f5d', dataType: "Coded"});
    // const requiresMedicalInterventionTreatmentConcept = EntityFactory.createConcept({name: "Is there a medical facillity intervention required for treatment?\n", uuid: '35f880ca-60b5-4240-97e1-813c0a7a78c4', dataType: "Coded"});

    // const yesConcept = EntityFactory.createConcept({name: "Yes", uuid: '8ebbf088-f292-483e-9084-7de919ce67b7', dataType: "NA"});
    // const noConcept = EntityFactory.createConcept({name: "No", uuid: 'a77bd700-1409-4d52-93bc-9fe32c0e169b', dataType: "NA"});

    // const yesAnswer = EntityFactory.createAnswerConcept(yesConcept,1);
    // const noAnswer = EntityFactory.createAnswerConcept(noConcept,2);
    const anmRecommendedMedicalFacilityInterventionCon = EntityFactory.createCodedConceptWithAnswers(
        "Did the ANM recommend for a medical facility intervention?",
        ['Yes', 'No']
    );
    const programEncounter = EntityFactory.createProgramEncounter({
        encounterType: anc,
        programEnrolment: enrolment,
        observations: [EntityFactory.createObservation(hbConcept, 12),
             EntityFactory.createCodedObservation(anmRecommendedMedicalFacilityInterventionCon, 'Yes')]
    });
    const params = {entity: programEncounter};
    const scheduleBuilder = Anc({
        params: params,
        imports: {rulesConfig: {VisitScheduleBuilder: VisitScheduleBuilder, RuleCondition: RuleCondition}, moment: require('moment'), lodash: require('lodash')}
    });
    console.log(scheduleBuilder);
});
