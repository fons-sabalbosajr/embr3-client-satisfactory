// src/i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    resources: {
      en: {
        translation: {
          // Home.jsx
          agencyTitle: "Republic of the Philippines",
          department: "DEPARTMENT OF ENVIRONMENT AND NATURAL RESOURCES",
          bureau: "ENVIRONMENTAL MANAGEMENT BUREAU III",
          address1:
            "Masinop Corner, Matalino St., Diosdado Macapagal Government Center",
          address2: "Maimpis, City of San Fernando, Pampanga",
          csmTitle: "Online Client Satisfaction Measurement",
          feedbackText: "We want your feedback!",

          // i18n.js extras
          subtitle:
            "This Client Satisfaction Measurement (CSM) tracks the customer experience of government offices. Your feedback on your recently concluded transaction will help this office provide a better service. Personal information shared will be kept confidential and you always have the option not to answer this form.",
          takeSurvey: "Take the Survey",
          selectLanguage: "Select Language",
          toggleColor: "Toggle color scheme",

          // Survey.jsx
          personalInfo: "Personal Information",
          submitSurvey: "Submit Survey",
          cancel: "Cancel",
          next: "Next",
          back: "Back",
          thankYou: "Thank you for your feedback!",

          // ClientInfoCard.jsx
          clientTypeLabel: "Client Type",
          selectClientType: "Select client type",
          clientTypeCitizen: "Citizen",
          clientTypeBusiness: "Business",
          clientTypeGovernment: "Government",
          companyNamePlaceholder: "Company Name",
          enterCompanyName: "Enter company name",
          agencyPlaceholder: "Enter agency name",
          ageLabel: "Age",
          agePlaceholder: "Enter age",
          genderLabel: "Gender",
          selectGender: "Select gender",
          regionLabel: "Region",
          agencyLabel: "Agency",
          selectServicePlaceholder: "Service Availed",
          serviceAvailedLabel: "Select service(s) Availed",
          selectService: "This field is required",
          regionAgencyNote: "Region and agency are pre-filled automatically.",
          selectAnswerPlaceholder: "Select Answer",
          selectRequired: "This field is required",

          gender: {
            Male: "Male",
            Female: "Female",
          },

          step: {
            primaryInfo: "Primary Info",
            citizensCharter: "Citizens Charter",
            sqdShort: "SQD",
            sqdFull: "Service Quality Dimensions (SQD)",
          },

          questions: {
            Q7: {
              text: "Which of the following best describes your awareness of a Citizen's Charter?",
              options: [
                "I know what is Citizen's Charter is and I saw it in this office.",
                "I know what is Citizen's Charter is but I did not see it in this office.",
                "I do not know what a Citizen's Charter is.",
              ],
            },
            Q8: {
              text: "If aware of CC (answered 1-3 in CC1), would you say that the CC of this office was followed?",
              options: [
                "Easy to see and follow",
                "Somewhat easy to see and follow",
                "Difficult to see and follow",
                "Not visible or not followed at all",
              ],
            },
            Q9: {
              text: "If aware of CC (answered 1-3 in CC1), how much did the CC helps you in your transactions?",
              options: [
                "Yes, I was able to see and follow the Citizen's Charter",
                "No, I was not able to see and follow the Citizen's Charter",
              ],
            },
            Q10: {
              text: "I am satisfied with the service that I availed.",
              options: {
                StronglyAgree: "Strongly Agree",
                Agree: "Agree",
                Satisfactory: "Neither Agree nor Disagree",
                Disagree: "Disagree",
                StronglyDisagree: "Strongly Disagree",
                NA: "Not Applicable",
              },
            },
            Q11: {
              text: "I sepent a reasonable amount of time for my transaction.",
              options: {
                StronglyAgree: "Strongly Agree",
                Agree: "Agree",
                Satisfactory: "Walang Kinikilingan",
                Satisfactory: "Neither Agree nor Disagree",
                Disagree: "Disagree",
                StronglyDisagree: "Strongly Disagree",
                NA: "Not Applicable",
              },
            },
            Q12: {
              text: "The office followed the transaction's requirements and steps based on the information provided.",
              options: {
                StronglyAgree: "Strongly Agree",
                Agree: "Agree",
                Satisfactory: "Neither Agree nor Disagree",
                Disagree: "Disagree",
                StronglyDisagree: "Strongly Disagree",
                NA: "Not Applicable",
              },
            },
            Q13: {
              text: "The steps (including payment) I needed to do for my transaction were easy and simple.",
              options: {
                StronglyAgree: "Strongly Agree",
                Agree: "Agree",
                Satisfactory: "Neither Agree nor Disagree",
                Disagree: "Disagree",
                StronglyDisagree: "Strongly Disagree",
                NA: "Not Applicable",
              },
            },
            Q14: {
              text: "I easily found information about my transaction from the office's website.",
              options: {
                StronglyAgree: "Strongly Agree",
                Agree: "Agree",
                Satisfactory: "Neither Agree nor Disagree",
                Disagree: "Disagree",
                StronglyDisagree: "Strongly Disagree",
                NA: "Not Applicable",
              },
            },
            Q15: {
              text: "I paid a reasonable amount of fees for my transaction (If service was freem mark the N/A icon).",
              options: {
                StronglyAgree: "Strongly Agree",
                Agree: "Agree",
                Satisfactory: "Neither Agree nor Disagree",
                Disagree: "Disagree",
                StronglyDisagree: "Strongly Disagree",
                NA: "Not Applicable",
              },
            },
            Q16: {
              text: "I am confident my online transaction was secure.",
              options: {
                StronglyAgree: "Strongly Agree",
                Agree: "Agree",
                Satisfactory: "Neither Agree nor Disagree",
                Disagree: "Disagree",
                StronglyDisagree: "Strongly Disagree",
                NA: "Not Applicable",
              },
            },
            Q17: {
              text: "The office online support was available, and (if asked questions) online support was quick to respond.",
              options: {
                StronglyAgree: "Strongly Agree",
                Agree: "Agree",
                Satisfactory: "Neither Agree nor Disagree",
                Disagree: "Disagree",
                StronglyDisagree: "Strongly Disagree",
                NA: "Not Applicable",
              },
            },
            Q18: {
              text: "I got what I needed from the government office, or (if denied) denial of request was sufficiently explained to me.",
              options: {
                StronglyAgree: "Strongly Agree",
                Agree: "Agree",
                Satisfactory: "Neither Agree nor Disagree",
                Disagree: "Disagree",
                StronglyDisagree: "Strongly Disagree",
                NA: "Not Applicable",
              },
            },
            Q19: {
              text: "Do you have any other comments or suggestions?",
              options: [],
            },
          },

          section: {
            personalInfo: "Personal Information",
            citizensCharter: "Citizen’s Charter",
            sqd: "Service Quality Dimensions",
            remarks: "Remarks / Suggestions",
          },

          summaryLabels: {
            region: "Region",
            agency: "Agency",
            customerType: "Customer Type",
            companyName: "Establishment/Proponent Name",
            gender: "Gender",
            age: "Age",
            serviceAvailed: "Service Availed",
          },

          summary: {
            confirmTitle: "Please confirm your responses",
            submit: "Submit",
            cancel: "Cancel",
          },
        },
      },

      fil: {
        translation: {
          // Home.jsx
          agencyTitle: "Republic of the Philippines",
          department: "DEPARTMENT OF ENVIRONMENT AND NATURAL RESOURCES",
          bureau: "ENVIRONMENTAL MANAGEMENT BUREAU III",
          address1:
            "Masinop Corner, Matalino St., Diosdado Macapagal Government Center",
          address2: "Maimpis, City of San Fernando, Pampanga",
          csmTitle: "Online Client Satisfaction Measurement",
          feedbackText: "Kailangan namin ang iyong puna!",

          // i18n.js extras
          subtitle:
            "Ang Client Satisfaction Measurement (CSM) ay naglalayong masubaybayan ang karanasan ng taumbayan hinggil sa kanilang pakkikitransaksyon sa mga tanggapan ng gobyerno. Makatutulong ang inyong kasagutan ukol sa inyong naging karanasan sa kakatpos lamang ng transaksyon, upang mas mapabuti at lalong mapahusay ang aming serbisyo publiko. Ang personal na impormasyon na iyong ibabahagi ay mananatiling kumpidensyal. Maari ring piliin na hindi sagutin ang sarbey na ito.",
          takeSurvey: "Sagutan ang Survey",
          selectLanguage: "Piliin ang Wika",
          toggleColor: "I-toggle ang tema",

          // Survey.jsx
          personalInfo: "Impormasyon ng Kliyente",
          submitSurvey: "Ipasa ang Survey",
          cancel: "Kanselahin",
          next: "Susunod",
          back: "Bumalik",
          thankYou: "Maraming salamat sa iyong puna!",

          // ClientInfoCard.jsx
          clientTypeLabel: "Uri ng Kliyente",
          selectClientType: "Pumili ng uri ng kliyente",
          clientTypeCitizen: "Mamamayan",
          clientTypeBusiness: "Negosyo",
          clientTypeGovernment: "Gobyerno (Empleyado o Ahensya)",
          companyNamePlaceholder: "Pangalan ng Kumpanya/Institusyon",
          enterCompanyName: "Ilagay ang pangalan ng kumpanya",
          agencyPlaceholder: "Ilagay ang pangalan ng ahensya",
          agePlaceholder: "Ilagay ang Edad",
          ageLabel: "Edad",
          genderLabel: "Kasarian",
          selectGender: "Pumili ng Kasarian",
          regionLabel: "Rehiyon",
          agencyLabel: "Ahensya",
          serviceAvailedLabel: "Uri ng Transaksyon o Serbisyo",
          selectServicePlaceholder: "Pumili Transaksyon o Serbisyo",
          selectService: "Kailangang punan ang bahaging ito.",
          regionAgencyNote:
            "Ang rehiyon at ahensya ay awtomatikong nang nakalagda.",
          selectAnswerPlaceholder: "Pumili ng Sagot",
          selectRequired: "Ang bahaging ito ay kailangang punan.",

          step: {
            primaryInfo: "Pangunahing Impormasyon",
            citizensCharter: "Citizens Charter",
            sqdShort: "SQD",
            sqdFull: "Mga Dimensyon ng Kalidad ng Serbisyo (SQD)",
          },

          gender: {
            Male: "Lalaki",
            Female: "Babae",
          },

          // Questions
          questions: {
            Q7: {
              text: "Alin sa mga sumusunod ang naglalarawan sa yong kaalaman sa Citizen's Charter?",
              options: [
                "Alam ko kung ano ang Citizen's Charter at nakita ko ito sa opisina.",
                "Alam ko kung ano ang Citizen's Charter pero hindi ko ito nakita sa opisina.",
                "Hindi ko alam kung ano ang Citizen's Charter.",
              ],
            },
            Q8: {
              text: "Kung alam mo ang Citizen's Charter (sumagot ng 1-3 sa CC1), masasabi mo bang nasunod ang Citizen's Charter ng opisina?",
              options: [
                "Madaling makita at sundan",
                "Medyo madaling makita at sundan",
                "Mahirap makita at sundan",
                "Hindi nakikita o hindi nasunod",
              ],
            },
            Q9: {
              text: "Kung alam mo ang Citizen's Charter (sumagot ng 1-3 sa CC1), gaano nakatulong ang Citizen's Charter sa iyong transaksyon?",
              options: [
                "Lubos na nakatulong ang Citizen's Charter",
                "Hindi nakatulong ang Citizen's Charter",
              ],
            },
            Q10: {
              text: "Nasiyahan ako sa serbisyo na aking natanggap sa napuntahan na tanggapan.",
              options: {
                StronglyAgree: "Lubos na Sumasang-ayon",
                Agree: "Sumasang-ayon",
                Satisfactory: "Walang Kinikilingan",
                Disagree: "Hindi Sumasang-ayon",
                StronglyDisagree: "Lubos na Hindi Sumasang-ayon",
                NA: "Hindi Naaangkop",
              },
            },
            Q11: {
              text: "Makatwiran ang oras na aking ginugol para sa pag proseso ng aking transaksyon.",
              options: {
                StronglyAgree: "Lubos na Sumasang-ayon",
                Agree: "Sumasang-ayon",
                Satisfactory: "Walang Kinikilingan",
                Disagree: "Hindi Sumasang-ayon",
                StronglyDisagree: "Lubos na Hindi Sumasang-ayon",
                NA: "Hindi Naaangkop",
              },
            },
            Q12: {
              text: "Ang opisina ay sumusunod sa mga kinakailangang dokumento at mga hakbang bata sa impormasyong ibinigay.",
              options: {
                StronglyAgree: "Lubos na Sumasang-ayon",
                Agree: "Sumasang-ayon",
                Satisfactory: "Walang Kinikilingan",
                Disagree: "Hindi Sumasang-ayon",
                StronglyDisagree: "Lubos na Hindi Sumasang-ayon",
                NA: "Hindi Naaangkop",
              },
            },
            Q13: {
              text: "Ang mga hakbang sa pagproseso, kasama na ang pagbayad ay madali at simple lamang.",
              options: {
                StronglyAgree: "Lubos na Sumasang-ayon",
                Agree: "Sumasang-ayon",
                Satisfactory: "Walang Kinikilingan",
                Disagree: "Hindi Sumasang-ayon",
                StronglyDisagree: "Lubos na Hindi Sumasang-ayon",
                NA: "Hindi Naaangkop",
              },
            },
            Q14: {
              text: "Mabilis at madali akong nakahanap ng impormasyon tungkol sa aking transaksyon mula sa opisina o sa website na ito.",
              options: {
                StronglyAgree: "Lubos na Sumasang-ayon",
                Agree: "Sumasang-ayon",
                Satisfactory: "Walang Kinikilingan",
                Disagree: "Hindi Sumasang-ayon",
                StronglyDisagree: "Lubos na Hindi Sumasang-ayon",
                NA: "Hindi Naaangkop",
              },
            },
            Q15: {
              text: "Nagbayad ako ng makatwirang halaga para sa aking transaksyon. (Kung ang serbisyo ay ibinigay ng libre, piliin ang N/A na icon.",
              options: {
                StronglyAgree: "Lubos na Sumasang-ayon",
                Agree: "Sumasang-ayon",
                Satisfactory: "Walang Kinikilingan",
                Disagree: "Hindi Sumasang-ayon",
                StronglyDisagree: "Lubos na Hindi Sumasang-ayon",
                NA: "Hindi Naaangkop",
              },
            },
            Q16: {
              text: "Pakiramdam ko ay patas ang opisina sa lahat o walang palakasan sa aking transaksyon.",
              options: {
                StronglyAgree: "Lubos na Sumasang-ayon",
                Agree: "Sumasang-ayon",
                Satisfactory: "Walang Kinikilingan",
                Disagree: "Hindi Sumasang-ayon",
                StronglyDisagree: "Lubos na Hindi Sumasang-ayon",
                NA: "Hindi Naaangkop",
              },
            },
            Q17: {
              text: "Magalang akong trinato ng mga tauhan, at (kung sakali ako ay humingi ng tulong) alam ko na sila ay handang tumulong sa akin.",
              options: {
                StronglyAgree: "Lubos na Sumasang-ayon",
                Agree: "Sumasang-ayon",
                Satisfactory: "Walang Kinikilingan",
                Disagree: "Hindi Sumasang-ayon",
                StronglyDisagree: "Lubos na Hindi Sumasang-ayon",
                NA: "Hindi Naaangkop",
              },
            },
            Q18: {
              text: "Nakuha ko ang kinakailangan ko mula sa tanggapan ng gobyerno, kung tinanggihan man, ito ay sapat na ipinaliwanag sa akin.",
              options: {
                StronglyAgree: "Lubos na Sumasang-ayon",
                Agree: "Sumasang-ayon",
                Satisfactory: "Walang Kinikilingan",
                Disagree: "Hindi Sumasang-ayon",
                StronglyDisagree: "Lubos na Hindi Sumasang-ayon",
                NA: "Hindi Naaangkop",
              },
            },
            Q19: {
              text: "Mga suhestyon kung paano pa mapapabuti ang aming serbisyo(opsyonal)?",
              options: [],
            },
          },

          rating: {
            stronglyDisagree: "Lubos na Hindi Sumasang-ayon",
            disagree: "Hindi Sumasang-ayon",
            satisfactory: "Walang Kinikilingan",
            agree: "Sumasang-ayon",
            stronglyAgree: "Lubos na Sumasang-ayon",
            notApplicable: "Hindi Naaangkop",
          },

          section: {
            personalInfo: "Personal Information",
            citizensCharter: "Citizen’s Charter",
            sqd: "Service Quality Dimensions",
            remarks: "Remarks / Suggestions",
          },

          summaryLabels: {
            region: "Region",
            agency: "Agency",
            customerType: "Customer Type",
            companyName: "Establishment/Proponent Name",
            gender: "Gender",
            age: "Age",
            serviceAvailed: "Service Availed",
          },

          summary: {
            confirmTitle: "Pakitiyak ang iyong mga sagot",
            submit: "Ipasa",
            cancel: "Kanselahin",
          },
        },
      },
    },
  });

export default i18n;
