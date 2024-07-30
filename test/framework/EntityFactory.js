import {
    ChecklistItem,
    Concept,
    ConceptAnswer, EncounterType,
    Form,
    FormElement,
    FormElementGroup,
    Individual,
    ModelGeneral as General, MultipleCodedValues,
    Observation,
    PrimitiveValue,
    Program,
    ProgramEncounter,
    ProgramEnrolment, SingleCodedValue
} from 'openchs-models';
import _ from "lodash";

function addCodedAnswers(concept, answerConceptNames) {
    _.forEach(answerConceptNames, (answer) => {
        const answerConcept = EntityFactory.createConcept({name: answer, dataType: Concept.dataType.NA});
        concept.addAnswer(answerConcept);
    });
}

class EntityFactory {
    static concepts = new Map();

    static createIndividual(name) {
        let individual = new Individual();
        individual.uuid = General.randomUUID();
        individual.name = name;
        individual.enrolments = [];
        individual.encounters = [];
        return individual;
    }

    static createFormElementGroup(form) {
        const formElementGroup = new FormElementGroup();
        formElementGroup.formElements = [];
        formElementGroup.form = form;
        form.addFormElementGroup(formElementGroup);
        return formElementGroup;
    }

    static createFormElementGroup(name, displayOrder, form) {
        const formElementGroup = EntityFactory.createFormElementGroup(form);
        formElementGroup.name = name;
        formElementGroup.displayOrder = displayOrder;
        return formElementGroup;
    }

    static createForm(name) {
        const form = new Form();
        form.name = name;
        form.formElementGroups = [];
        return form;
    }

    static createFormElement(name, mandatory, concept, displayOrder, type) {
        const formElement = new FormElement();
        formElement.uuid = General.randomUUID();
        formElement.name = name;
        formElement.mandatory = mandatory;
        formElement.concept = concept;
        formElement.displayOrder = displayOrder;
        formElement.type = type;
        return formElement;
    }

    static createConcept({name, dataType, uuid = General.randomUUID()}) {
        if (EntityFactory.concepts.has(name))
            return EntityFactory.concepts.get(name);

        const concept = Concept.create(name, dataType);
        concept.uuid = uuid || General.randomUUID();
        concept.answers = [];
        EntityFactory.concepts.set(concept.name, concept);
        return concept;
    }

    static createCodedConceptWithAnswers(conceptName, answers) {
        const concept = EntityFactory.createConcept({name: conceptName, dataType: Concept.dataType.Coded});
        addCodedAnswers(concept, answers);
        return concept;
    }

    static createAnswerConcept(concept, answerOrder) {
        let conceptAnswer = new ConceptAnswer();
        conceptAnswer.uuid = General.randomUUID();
        conceptAnswer.concept = concept;
        conceptAnswer.answerOrder = answerOrder;
        return conceptAnswer;
    }

    static addChecklistItem(checklist, name, dueDate) {
        const item = ChecklistItem.create();
        item.concept = Concept.create(name, Concept.dataType.NA);
        item.dueDate = dueDate;
        checklist.addItem(item);
        return item;
    }

    static createObservation(concept, value) {
        const observation = new Observation();
        observation.concept = concept;
        observation.valueJSON = JSON.stringify(new PrimitiveValue(value));
        return observation;
    }

    static createCodedObservation(concept, value) {
        const observation = new Observation();
        observation.concept = concept;
        const answerConcept = EntityFactory.concepts.get(value);
        observation.valueJSON = JSON.stringify(new SingleCodedValue(answerConcept.uuid));
        return observation;
    }

    static createMultipleCodedObservation(concept, value) {
        const observation = new Observation();
        observation.concept = concept;
        observation.valueJSON = JSON.stringify(new MultipleCodedValues(value));
        return observation;
    }

    static createProgramEncounter({
                                      programEnrolment,
                                      encounterDateTime,
                                      observations = [],
                                      encounterType,
                                      earliestDateTime = new Date(),
                                      maxVisitDateTime
                                  }) {
        const programEncounter = ProgramEncounter.createEmptyInstance();
        programEncounter.observations = observations;
        programEncounter.encounterType = encounterType;
        programEncounter.programEnrolment = programEnrolment;
        programEncounter.encounterDateTime = encounterDateTime;
        programEncounter.earliestVisitDateTime = earliestDateTime;
        programEncounter.maxVisitDateTime = maxVisitDateTime;

        programEnrolment.addEncounter(programEncounter);

        return programEncounter;
    }

    static editProgramEncounter({
                                    programEncounter,
                                    encounterDateTime,
                                    observations = []
                                }) {
        const existingObservations = programEncounter.observations;
        observations.forEach(observation => {
            const existingObservation = existingObservations.find(existingObservation => existingObservation.concept.name === observation.concept.name);
            existingObservation.valueJSON = observation.valueJSON;
        });
        programEncounter.encounterDateTime = encounterDateTime;
        return programEncounter;
    }

    static createEncounterType({uuid = General.randomUUID(), name}) {
        const encounterType = new EncounterType();
        encounterType.uuid = uuid;
        encounterType.name = name;
        encounterType.displayName = name;
        return encounterType;
    }

    static createProgram({
                             uuid = General.randomUUID(),
                             name,
                             colour = '#012345',
                             allowMultipleEnrolments = false,
                             manualEligibilityCheckRequired = false
                         }) {
        const program = new Program();
        program.uuid = uuid;
        program.name = name;
        program.displayName = name;
        program.programSubjectLabel = name;
        program.operationalProgramName = name;
        program.colour = colour;
        program.allowMultipleEnrolments = allowMultipleEnrolments;
        program.manualEligibilityCheckRequired = manualEligibilityCheckRequired;
        return program;
    }

    static createEnrolment({enrolmentDateTime = new Date(), uuid, programExitDateTime, program = null, observations = [], individual}) {
        const programEnrolment = ProgramEnrolment.createEmptyInstance();
        programEnrolment.uuid = uuid || programEnrolment.uuid;
        programEnrolment.enrolmentDateTime = enrolmentDateTime;
        programEnrolment.program = program;
        programEnrolment.programExitDateTime = programExitDateTime;
        programEnrolment.observations = observations;

        programEnrolment.encounters = [];
        programEnrolment.individual = individual;
        individual.addEnrolment(programEnrolment);

        return programEnrolment;
    }
}

export default EntityFactory;
