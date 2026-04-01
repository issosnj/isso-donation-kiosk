import Foundation
import SwiftUI
import Combine

enum AppLanguage: String, CaseIterable, Codable {
    case english = "en"
    case gujarati = "gu"
    case hindi = "hi"
    
    var displayName: String {
        switch self {
        case .english: return "English"
        case .gujarati: return "ગુજરાતી"
        case .hindi: return "हिंदी"
        }
    }
    
    var nativeName: String {
        switch self {
        case .english: return "English"
        case .gujarati: return "ગુજરાતી"
        case .hindi: return "हिंदी"
        }
    }
}

class LanguageManager: ObservableObject {
    static let shared = LanguageManager()
    
    @Published var currentLanguage: AppLanguage {
        didSet {
            UserDefaults.standard.set(currentLanguage.rawValue, forKey: "selectedLanguage")
        }
    }
    
    private init() {
        // Load saved language or default to English
        if let savedLanguage = UserDefaults.standard.string(forKey: "selectedLanguage"),
           let language = AppLanguage(rawValue: savedLanguage) {
            self.currentLanguage = language
        } else {
            self.currentLanguage = .english
        }
    }
    
    // Translation dictionary
    private let translations: [AppLanguage: [String: String]] = [
        .english: [
            // Home Screen
            "welcome": "Welcome to Shree Swaminarayan Hindu Temple",
            "isso": "International Swaminarayan Satsang Organization (ISSO)",
            "underGadi": "Under Shree NarNarayan Dev Gadi",
            "tapToDonate": "Tap To Donate",
            "quickActions": "Quick Actions",
            "events": "Events",
            "whatsappGroup": "WhatsApp Group",
            "joinWhatsAppGroup": "Join WhatsApp Group",
            "whatsAppDescription": "Stay updated with temple events, announcements, and daily messages.",
            "scanToJoinWhatsAppGroup": "Scan to join WhatsApp group",
            "observance": "Observance",
            "observanceSubtitle": "Important upcoming religious observances",
            "close": "Close",
            "today": "Today",
            "religiousObservances": "Religious Observances",
            "done": "Done",
            "observanceNote": "Please note that certain fasting dates are subject to change based on the lunar calendar.",
            "noUpcomingObservances": "No upcoming observances",
            "upcomingEvents": "Upcoming Events",
            
            // Donation Flow
            "selectCategory": "Select Category",
            "selectAmount": "Select Amount",
            "customAmount": "Custom Amount",
            "quantity": "Quantity",
            "qtyLabel": "Qty",
            "reviewDonation": "Review Donation",
            "donorInformation": "Donor Information",
            "donorInfo": "Donor Info",
            "anonymousSeva": "Anonymous Seva",
            "phoneNumber": "Phone Number",
            "phoneOptional": "Phone (Optional)",
            "name": "Name",
            "nameOptional": "Name (Optional)",
            "email": "Email",
            "emailForReceipt": "Email for Receipt (Optional)",
            "mailingAddress": "Mailing Address",
            "mailingAddressOptional": "Mailing Address (Optional)",
            "enterYourName": "Enter your name",
            "enterYourPhone": "Enter your phone number",
            "enterYourEmail": "Enter your email",
            "enterYourAddress": "Enter your mailing address",
            "continue": "Continue",
            "proceedToPayment": "Proceed to Payment",
            "returnToHome": "Return to Home",
            "backToDonation": "Back to Donation",
            "home": "Home",
            "selectAmountToContinue": "Select Amount to Continue",
            
            // Payment
            "processingHeading": "Processing your payment",
            "processingHoldNearReader": "Hold your card flat on or near the reader",
            "processingPayment": "Tap your card once",
            "processingSubtext": "If you hear a beep, please wait — do not tap again",
            "secureEncrypted": "Secure & encrypted",
            "paymentSuccessful": "Payment Successful",
            "paymentFailed": "Payment Failed",
            "thankYou": "Thank You",
            "receiptSent": "Receipt has been sent to your email",
            
            // Common
            "cancel": "Cancel",
            "confirm": "Confirm",
            "back": "Back",
            "next": "Next",
            "submit": "Submit",
            
            // Donation Selection Page (additional keys)
            "step2DonationSelection": "Step 2 of 3 • Donation Selection",
            "step3ReviewPayment": "Step 3 of 3 • Review & Payment",
            "donationSummary": "Donation Summary",
            "thankYouForYourSeva": "Thank you for your seva",
            "addDonorDetailsTitle": "Add Donor Details",
            "addDonorDetailsTitleOptional": "Add Donor Details (Optional)",
            "secureFastEncrypted": "Secure • Fast • Encrypted",
            "donationColon": "Donation:",
            "enterAmount": "Enter Amount",
            "total": "Total",
            "yajmanOpportunities": "Yajman Opportunities",
            "pledgeOption": "Pledge Option",
            "clickToDoAdditionalSeva": "Click to Do Additional Seva",
            "generalDonationLineLabel": "Donation",
            "additionalSevaTitle": "Additional seva",
            "additionalSevaInstructions": "Choose another category and amount. Your receipt will list each seva and the total.",
            "addToDonation": "Add to donation"
        ],
        .gujarati: [
            // Home Screen
            "welcome": "શ્રી સ્વામિનારાયણ હિંદુ મંદિરમાં આપનું સ્વાગત છે",
            "isso": "ઇન્ટરનેશનલ સ્વામિનારાયણ સત્સંગ ઓર્ગેનાઇઝેશન (ISSO)",
            "underGadi": "શ્રી નરનારાયણ દેવ ગાદી હેઠળ",
            "tapToDonate": "દાન કરવા માટે ટેપ કરો",
            "quickActions": "ઝડપી ક્રિયાઓ",
            "events": "ઇવેન્ટ્સ",
            "whatsappGroup": "વોટ્સએપ ગ્રુપ",
            "joinWhatsAppGroup": "વોટ્સએપ ગ્રુપમાં જોડાઓ",
            "whatsAppDescription": "મંદિર ઇવેન્ટ્સ, જાહેરાતો અને દૈનિક સંદેશાઓથી અપડેટ રહો.",
            "scanToJoinWhatsAppGroup": "વોટ્સએપ ગ્રુપમાં જોડાવા સ્કેન કરો",
            "observance": "અવલોકન",
            "observanceSubtitle": "મહત્વપૂર્ણ આગામી ધાર્મિક અવલોકનો",
            "close": "બંધ કરો",
            "today": "આજે",
            "religiousObservances": "ધાર્મિક અવલોકનો",
            "done": "પૂર્ણ",
            "observanceNote": "કૃપા કરીને નોંધ કરો કે ચંદ્ર પંચાંગના આધારે કેટલાક ઉપવાસની તારીખો બદલાઈ શકે છે.",
            "noUpcomingObservances": "કોઈ આગામી અવલોકનો નથી",
            "upcomingEvents": "આગામી ઇવેન્ટ્સ",
            
            // Donation Flow
            "selectCategory": "કેટેગરી પસંદ કરો",
            "selectAmount": "રકમ પસંદ કરો",
            "customAmount": "કસ્ટમ રકમ",
            "quantity": "જથ્થો",
            "qtyLabel": "જથ્થો",
            "reviewDonation": "દાનની સમીક્ષા કરો",
            "donorInformation": "દાતાની માહિતી",
            "donorInfo": "દાતા માહિતી",
            "anonymousSeva": "અનામ સેવા",
            "phoneNumber": "ફોન નંબર",
            "phoneOptional": "ફોન (વૈકલ્પિક)",
            "name": "નામ",
            "nameOptional": "નામ (વૈકલ્પિક)",
            "email": "ઇમેઇલ",
            "emailForReceipt": "રસીદ માટે ઇમેઇલ (વૈકલ્પિક)",
            "mailingAddress": "મેઇલિંગ સરનામું",
            "mailingAddressOptional": "મેઇલિંગ સરનામું (વૈકલ્પિક)",
            "enterYourName": "તમારું નામ દાખલ કરો",
            "enterYourPhone": "તમારો ફોન નંબર દાખલ કરો",
            "enterYourEmail": "તમારું ઇમેઇલ દાખલ કરો",
            "enterYourAddress": "તમારું મેઇલિંગ સરનામું દાખલ કરો",
            "continue": "ચાલુ રાખો",
            "proceedToPayment": "પેમેન્ટ પર આગળ વધો",
            "returnToHome": "હોમ પર પાછા જાઓ",
            "backToDonation": "દાન પૃષ્ઠ પર પાછા જાઓ",
            "home": "હોમ",
            "selectAmountToContinue": "ચાલુ રાખવા માટે રકમ પસંદ કરો",
            
            // Payment
            "processingHeading": "તમારું ભુગતાન પ્રક્રિયામાં છે",
            "processingHoldNearReader": "તમારું કાર્ડ રીડર પર અથવા નજીક સપાટ પકડી રાખો",
            "processingPayment": "તમારી કાર્ડ પર એક વાર ટેપ કરો",
            "processingSubtext": "જો તમે બીપ સાંભળો તો કૃપા કરીને રાહ જુઓ — ફરીથી ટેપ કરશો નહીં",
            "secureEncrypted": "સુરક્ષિત અને એન્ક્રિપ્ટેડ",
            "paymentSuccessful": "પેમેન્ટ સફળ",
            "paymentFailed": "પેમેન્ટ નિષ્ફળ",
            "thankYou": "આભાર",
            "receiptSent": "રસીદ તમારા ઇમેઇલ પર મોકલવામાં આવી છે",
            
            // Common
            "cancel": "રદ કરો",
            "confirm": "પુષ્ટિ કરો",
            "back": "પાછળ",
            "next": "આગળ",
            "submit": "સબમિટ કરો",
            
            // Donation Selection Page (additional keys)
            "step2DonationSelection": "પગલું ૨/૩ • દાન પસંદગી",
            "step3ReviewPayment": "પગલું ૩/૩ • સમીક્ષા અને ચુકવણી",
            "donationSummary": "દાન સારાંશ",
            "thankYouForYourSeva": "તમારી સેવા બદલ આભાર",
            "addDonorDetailsTitle": "દાતા વિગતો ઉમેરો",
            "addDonorDetailsTitleOptional": "દાતા વિગતો ઉમેરો (વૈકલ્પિક)",
            "secureFastEncrypted": "સુરક્ષિત • ઝડપી • એન્ક્રિપ્ટેડ",
            "donationColon": "દાન:",
            "enterAmount": "રકમ દાખલ કરો",
            "total": "કુલ",
            "yajmanOpportunities": "યજમાન તકો",
            "pledgeOption": "વચન વિકલ્પ",
            "clickToDoAdditionalSeva": "વધારાની સેવા કરવા અહીં ટેપ કરો",
            "generalDonationLineLabel": "દાન",
            "additionalSevaTitle": "વધારાની સેવા",
            "additionalSevaInstructions": "બીજી કેટેગરી અને રકમ પસંદ કરો. તમારી રસીદમાં દરેક સેવા અને કુલ દર્શાવશે.",
            "addToDonation": "દાનમાં ઉમેરો"
        ],
        .hindi: [
            // Home Screen
            "welcome": "श्री स्वामीनारायण हिंदू मंदिर में आपका स्वागत है",
            "isso": "इंटरनेशनल स्वामीनारायण सत्संग ऑर्गेनाइजेशन (ISSO)",
            "underGadi": "श्री नरनारायण देव गादी के अंतर्गत",
            "tapToDonate": "दान करने के लिए टैप करें",
            "quickActions": "त्वरित कार्य",
            "events": "इवेंट्स",
            "whatsappGroup": "व्हाट्सएप ग्रुप",
            "joinWhatsAppGroup": "व्हाट्सएप ग्रुप में जुड़ें",
            "whatsAppDescription": "मंदिर कार्यक्रम, घोषणाओं और दैनिक संदेशों के साथ अपडेट रहें।",
            "scanToJoinWhatsAppGroup": "व्हाट्सएप ग्रुप में जुड़ने के लिए स्कैन करें",
            "observance": "अवलोकन",
            "observanceSubtitle": "महत्वपूर्ण आगामी धार्मिक अवलोकन",
            "close": "बंद करें",
            "today": "आज",
            "religiousObservances": "धार्मिक अवलोकन",
            "done": "पूर्ण",
            "observanceNote": "कृपया ध्यान दें कि चंद्र पंचांग के आधार पर कुछ उपवास की तारीखें बदल सकती हैं।",
            "noUpcomingObservances": "कोई आगामी अवलोकन नहीं",
            "upcomingEvents": "आगामी इवेंट्स",
            
            // Donation Flow
            "selectCategory": "श्रेणी चुनें",
            "selectAmount": "राशि चुनें",
            "customAmount": "कस्टम राशि",
            "quantity": "मात्रा",
            "qtyLabel": "मात्रा",
            "reviewDonation": "दान की समीक्षा करें",
            "donorInformation": "दाता की जानकारी",
            "donorInfo": "दाता जानकारी",
            "anonymousSeva": "अनाम सेवा",
            "phoneNumber": "फोन नंबर",
            "phoneOptional": "फोन (वैकल्पिक)",
            "name": "नाम",
            "nameOptional": "नाम (वैकल्पिक)",
            "email": "ईमेल",
            "emailForReceipt": "रसीद के लिए ईमेल (वैकल्पिक)",
            "mailingAddress": "मेलिंग पता",
            "mailingAddressOptional": "मेलिंग पता (वैकल्पिक)",
            "enterYourName": "अपना नाम दर्ज करें",
            "enterYourPhone": "अपना फोन नंबर दर्ज करें",
            "enterYourEmail": "अपना ईमेल दर्ज करें",
            "enterYourAddress": "अपना मेलिंग पता दर्ज करें",
            "continue": "जारी रखें",
            "proceedToPayment": "भुगतान पर आगे बढ़ें",
            "returnToHome": "होम पर वापस जाएं",
            "backToDonation": "दान पृष्ठ पर वापस जाएं",
            "home": "होम",
            "selectAmountToContinue": "जारी रखने के लिए राशि चुनें",
            
            // Payment
            "processingHeading": "आपका भुगतान प्रक्रिया में है",
            "processingHoldNearReader": "कार्ड को रीडर पर या उसके पास समतल रखें",
            "processingPayment": "अपना कार्ड एक बार टैप करें",
            "processingSubtext": "बीप सुनने पर कृपया प्रतीक्षा करें — दोबारा टैप न करें",
            "secureEncrypted": "सुरक्षित और एन्क्रिप्टेड",
            "paymentSuccessful": "भुगतान सफल",
            "paymentFailed": "भुगतान विफल",
            "thankYou": "धन्यवाद",
            "receiptSent": "रसीद आपके ईमेल पर भेजी गई है",
            
            // Common
            "cancel": "रद्द करें",
            "confirm": "पुष्टि करें",
            "back": "पीछे",
            "next": "आगे",
            "submit": "सबमिट करें",
            
            // Donation Selection Page (additional keys)
            "step2DonationSelection": "चरण २ of ३ • दान चयन",
            "step3ReviewPayment": "चरण ३ of ३ • समीक्षा और भुगतान",
            "donationSummary": "दान सारांश",
            "thankYouForYourSeva": "आपकी सेवा के लिए धन्यवाद",
            "addDonorDetailsTitle": "दाता विवरण जोड़ें",
            "addDonorDetailsTitleOptional": "दाता विवरण जोड़ें (वैकल्पिक)",
            "secureFastEncrypted": "सुरक्षित • तेज़ • एन्क्रिप्टेड",
            "donationColon": "दान:",
            "enterAmount": "राशि दर्ज करें",
            "total": "कुल",
            "yajmanOpportunities": "यजमान अवसर",
            "pledgeOption": "प्रतिज्ञा विकल्प",
            "clickToDoAdditionalSeva": "अतिरिक्त सेवा करने के लिए टैप करें",
            "generalDonationLineLabel": "दान",
            "additionalSevaTitle": "अतिरिक्त सेवा",
            "additionalSevaInstructions": "दूसरी श्रेणी और राशि चुनें। आपकी रसीद में प्रत्येक सेवा और कुल दिखेगा।",
            "addToDonation": "दान में जोड़ें"
        ]
    ]
    
    func translate(_ key: String) -> String {
        return translations[currentLanguage]?[key] ?? translations[.english]?[key] ?? key
    }
    
    func setLanguage(_ language: AppLanguage) {
        currentLanguage = language
    }
}

// Convenience extension for easy access
extension String {
    var localized: String {
        return LanguageManager.shared.translate(self)
    }
}

