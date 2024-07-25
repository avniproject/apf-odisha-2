export default function ({params, imports}) {
    const programEncounter = params.entity;
    const scheduleBuilder = new imports.rulesConfig.VisitScheduleBuilder({programEncounter});
    const moment = imports.moment;
    const _ = imports.lodash;

    const currentlyActiveInProgram = !programEncounter.programEnrolment.programExitDateTime;
    const isDeliveryEncounterIncomplete = !programEncounter.programEnrolment.hasCompletedEncounterOfType('Delivery');

    const scheduledOrCompletedEncountersOfType = (encounterType, nextVisitDate) => {

        const nextDateMonth = moment(nextVisitDate).month();
        const nextDateYear = moment(nextVisitDate).year();
        const data = programEncounter.programEnrolment.encounters.filter((enc) =>
            enc.encounterType.name === encounterType &&
            enc.voided == false &&
            enc.cancelDateTime == null &&
            moment(enc.earliestVisitDateTime).year() == nextDateYear &&
            moment(enc.earliestVisitDateTime).month() == nextDateMonth
        );
        return data;
    }

    function lastfilledEncounter(encounterType) {

        const lastVisitEncounters = programEncounter.programEnrolment.getEncountersOfType(encounterType, false);
        const latestEncounter = _.chain(lastVisitEncounters)
            .filter((encounter) => encounter.encounterDateTime && encounter.voided == false)
            .maxBy((encounter) => encounter.encounterDateTime)
            .value();
        return latestEncounter;
    }

    if (currentlyActiveInProgram && isDeliveryEncounterIncomplete) {

        let nextDate = moment(programEncounter.earliestVisitDateTime).add(1, 'M').startOf('month').toDate();
        const noAncEncountersScheduled = scheduledOrCompletedEncountersOfType("ANC", nextDate).length == 0;
        if (noAncEncountersScheduled) {
            scheduleBuilder.add({
                name: 'ANC',
                encounterType: 'ANC',
                earliestDate: nextDate,
                maxDate: moment(nextDate).endOf('month').toDate()
            });
        }

        const qrtDate = moment(programEncounter.encounterDateTime).toDate();
        const noQrtEncountersScheduled = scheduledOrCompletedEncountersOfType("QRT PW", qrtDate).length == 0;
        const isSevereAnemic = new imports.rulesConfig.RuleCondition({programEncounter}).when.valueInEncounter("68bc6e51-eb49-4816-b78b-2427bbab8d92").lessThan(7).matches();
        const requiresMedicalInterventionTreatment = new imports.rulesConfig.RuleCondition({programEncounter}).when.latestValueInEntireEnrolment("35f880ca-60b5-4240-97e1-813c0a7a78c4").containsAnswerConceptName("8ebbf088-f292-483e-9084-7de919ce67b7").matches();
        const anmRecommendedMedicalFacilityIntervention = new imports.rulesConfig.RuleCondition({programEncounter}).when.valueInEncounter("Did the ANM recommend for a medical facility intervention?").containsAnswerConceptName("Yes").matches();
        const qrtEligibility = isSevereAnemic || requiresMedicalInterventionTreatment || anmRecommendedMedicalFacilityIntervention;
        const ancEncounter = lastfilledEncounter('ANC');
        const isEditScenario = ancEncounter ? ancEncounter.uuid === programEncounter.uuid : false;
        const isHighRiskCondition = programEncounter.getObservationReadableValue('High risk condition');

        if (noQrtEncountersScheduled && qrtEligibility) {
            scheduleBuilder.add({
                name: 'QRT PW',
                encounterType: 'QRT PW',
                earliestDate: qrtDate,
                maxDate: moment(qrtDate).add(30, 'days').toDate()
            });
        } else if (!isEditScenario && isHighRiskCondition && !requiresMedicalInterventionTreatment && !anmRecommendedMedicalFacilityIntervention) {
            nextDate = moment(programEncounter.earliestVisitDateTime).add(1, 'M').startOf('month').toDate();
            scheduleBuilder.add({
                name: "PW Home Visit",
                encounterType: "PW Home Visit",
                earliestDate: nextDate,
                maxDate: moment(nextDate).add(7, 'days').toDate()
            });
        }
    }

    return scheduleBuilder.getAll();
};
