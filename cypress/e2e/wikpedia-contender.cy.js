import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat.js';
import localizedFormat from 'dayjs/plugin/localizedFormat.js';
dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);

import { format } from '../support/helpers.js';

const CONTENDER_YEARS = ['2024', '2025'];

// GETTING FUTURE FIGHTS OR PAST FIGHTS

const columnOfWeight = `td:nth-of-type(1)`;
const columnOfCompetitorOne = `td:nth-of-type(2)`;
const columnOfCompetitorTwo = `td:nth-of-type(4)`;
const columnOfVictoryMethod = `td:nth-of-type(5)`;
const columnOfRoundOfVictory = `td:nth-of-type(6)`;
const columnOfTimeOfVictory = `td:nth-of-type(7)`;

describe('scrape wikipedia - contender series', () => {
    it('---------------', () => {
        CONTENDER_YEARS.forEach(year => {
            cy.fixture(`${year}/contender`).then(season => {
                const { url, weeks } = season;

                const event = {};
                const fights = [];

                cy.visit(url)
                    .get('[class="mw-logo-container skin-invert"]')
                    .should('be.visible');

                weeks.forEach(week => {
                    const { name, id, object, output } = week;

                    cy.get('[class="infobox"]')
                        .contains(id)
                        .should('be.visible')
                        .parent()
                        .within(infobox => {
                            cy.get('[class="infobox-above"]')
                                .as('NameOfEvent')
                                .invoke('text')
                                .then(name => {
                                    cy.get('@NameOfEvent')
                                        .parent()
                                        .next()
                                        .next()
                                        .find('[class="infobox-data"]')
                                        .invoke('text')
                                        .then(date => {
                                            event.name = name.trim();
                                            const d = dayjs(date.trim());
                                            event.date = d.format('MMMM Do, YYYY');
                                            event.place = 'Las Vegas, NV';
                                            event.venue = 'Apex';
                                            event.run = dayjs().format('LLL');
                                        });
                                });

                            cy.wrap(infobox)
                                .parent()
                                .parent()
                                .next()
                                .within(() => {
                                    cy.get('tr').each((row, indexOfRow) => {
                                        if (indexOfRow > 1) {
                                            cy.wrap(row).within(() => {
                                                fights[indexOfRow] = {};
                                                fights[indexOfRow].bets = '⭐';
                                                fights[indexOfRow].notes = '';
                                                fights[indexOfRow].questions = [];
                                                fights[indexOfRow].competitors = [];
                                                fights[indexOfRow].ranking = [];
                                                fights[indexOfRow].experience = [];
                                                fights[indexOfRow].summary = [];
                                                fights[indexOfRow].rounds = 3;
                                                fights[indexOfRow].missed = { fighter: '', weight: '' };
                                                fights[indexOfRow].event = name;
                                                fights[indexOfRow].placement = 'main';
                                                // FIRST TWO ROWS ARE HEADERS - SUBTRACTING THOSE OUT
                                                fights[indexOfRow].order = indexOfRow - 2 + 1;

                                                cy.get(columnOfWeight)
                                                    .invoke('text')
                                                    .then(weight => {
                                                        fights[indexOfRow].weight = weight
                                                            .replace("Women's ", '')
                                                            .trim()
                                                            .toLowerCase();
                                                        fights[indexOfRow].gender = weight.includes("Women's")
                                                            ? 'female'
                                                            : 'male';

                                                        fights[indexOfRow].override = null;
                                                        fights[indexOfRow].added = [];
                                                        fights[indexOfRow].omit = false;
                                                        fights[indexOfRow].winner = {};

                                                        if (row.text().includes('def.')) {
                                                            cy.get(columnOfCompetitorOne)
                                                                .invoke('text')
                                                                .then(winner => {
                                                                    const formatted = format(
                                                                        winner.trim().toLowerCase()
                                                                    );

                                                                    fights[indexOfRow].competitors[0] = formatted;
                                                                    fights[indexOfRow].winner.name = formatted;
                                                                    fights[indexOfRow].winner.awarded = false;
                                                                })
                                                                .get(columnOfCompetitorTwo)
                                                                .invoke('text')
                                                                .then(loser => {
                                                                    fights[indexOfRow].competitors[1] = format(
                                                                        loser.trim().toLowerCase()
                                                                    );
                                                                })
                                                                .get(columnOfVictoryMethod)
                                                                .invoke('text')
                                                                .then(method => {
                                                                    fights[indexOfRow].winner.method = /TKO|KO/.test(
                                                                        method
                                                                    )
                                                                        ? 'tko'
                                                                        : /Submission/.test(method)
                                                                          ? 'sub'
                                                                          : /Decision/.test(method)
                                                                            ? 'decision'
                                                                            : /NC|No Contest/.test(method)
                                                                              ? 'nc'
                                                                              : /DQ/.test(method)
                                                                                ? 'dq'
                                                                                : method;
                                                                    fights[indexOfRow].winner.type = !/\(/.test(method)
                                                                        ? null
                                                                        : method
                                                                              .split('(')[1]
                                                                              .replace(')', '')
                                                                              .replace('-', ' ')
                                                                              .trim()
                                                                              .toLowerCase();
                                                                })
                                                                .get(columnOfRoundOfVictory)
                                                                .invoke('text')
                                                                .then(round => {
                                                                    fights[indexOfRow].winner.round = round.trim();
                                                                })
                                                                .get(columnOfTimeOfVictory)
                                                                .invoke('text')
                                                                .then(time => {
                                                                    fights[indexOfRow].winner.time = time.trim();
                                                                });
                                                        } else {
                                                            cy.get(columnOfCompetitorOne)
                                                                .invoke('text')
                                                                .then(winner => {
                                                                    const formatted = format(
                                                                        winner.trim().toLowerCase()
                                                                    );

                                                                    fights[indexOfRow].competitors[0] = formatted;
                                                                })
                                                                .get(columnOfCompetitorTwo)
                                                                .invoke('text')
                                                                .then(loser => {
                                                                    fights[indexOfRow].competitors[1] = format(
                                                                        loser.trim().toLowerCase()
                                                                    );
                                                                });

                                                            fights[indexOfRow].winner = {};
                                                            fights[indexOfRow].winner.name = '';
                                                            fights[indexOfRow].winner.awarded = false;
                                                            fights[indexOfRow].winner.method = '';
                                                            fights[indexOfRow].winner.type = '';
                                                            fights[indexOfRow].winner.round = '';
                                                            fights[indexOfRow].winner.time = '';
                                                        }

                                                        fights[indexOfRow].me = {
                                                            winner: '',
                                                            method: '',
                                                            round: '',
                                                            minute: '',
                                                            notes: ''
                                                        };
                                                        fights[indexOfRow].odds = [
                                                            {
                                                                date: '',
                                                                epoch: '',
                                                                current: [[], [[], []], [], [], [], [[], []]]
                                                            }
                                                        ];
                                                    });
                                            });
                                        }
                                    });
                                });
                        })
                        .then(() => {
                            event.fights = fights.filter(item => item !== null);
                            cy.writeFile(output, `export const ${object} = ` + JSON.stringify(event));
                        });
                });
            });
        });
    });
});
