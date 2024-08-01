export default function
    ({params, imports}) {
    const programEncounter = params.entity;
    const scheduleBuilder = new imports.rulesConfig.VisitScheduleBuilder({
        programEncounter
    });
    const moment = imports.moment;
    const _ = imports.lodash;

    const earliestDate = moment(programEncounter.earliestVisitDateTime).add(1, 'month').startOf('month').toDate();

    let isEditScenario = programEncounter.programEnrolment.encounters.some((enc) =>
        enc.encounterType.name === 'Growth Monitoring' &&
        enc.voided === false &&
        moment(enc.earliestVisitDateTime).isSame(earliestDate, 'day')
    );

    if(programEncounter.programEnrolment.individual.getAgeInYears() < 5 && !isEditScenario) {
        scheduleBuilder.add({
            name: 'Growth Monitoring',
            encounterType: 'Growth Monitoring',
            earliestDate: earliestDate,
            maxDate: moment(earliestDate).add(30, 'days').toDate()
        });
    }

    const isTreatmentNotAtHome = programEncounter.getObservationReadableValue("What is the treatment advise for the SAM/MAM/GF2 child?") ? programEncounter.getObservationReadableValue("What is the treatment advise for the SAM/MAM/GF2 child?") != "Treatment at home" : false;
    const isTreatmentAtHome = programEncounter.getObservationReadableValue("What is the treatment advise for the SAM/MAM/GF2 child?") ? programEncounter.getObservationReadableValue("What is the treatment advise for the SAM/MAM/GF2 child?") == "Treatment at home" : false;
    const isSAM = programEncounter.getObservationReadableValue("Nutritional Status") == "SAM";
    const isGF1 = programEncounter.getObservationReadableValue("Growth Faltering") == "GF1";

    console.log('isSAM',programEncounter.getObservationReadableValue("Nutritional Status"));

    if((isTreatmentNotAtHome && !isEditScenario) || (isSAM && !isEditScenario) ){
        scheduleBuilder.add({
            name: 'QRT Child',
            encounterType: 'QRT Child',
            earliestDate: moment(programEncounter.encounterDateTime).toDate(),
            maxDate: moment(programEncounter.encounterDateTime).add(30, 'days').toDate()
        });
    }else if ((isTreatmentAtHome || isGF1 ) && !isEditScenario && !isSAM){
        scheduleBuilder.add({
            name: 'Child Home Visit',
            encounterType: 'Child Home Visit',
            earliestDate: moment(programEncounter.encounterDateTime).add(15, 'days').toDate(),
            maxDate: moment(programEncounter.encounterDateTime).add(22, 'days').toDate()
        });
    }

    return scheduleBuilder.getAll();
};