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
            "observance": "Observance",
            "religiousObservances": "Religious Observances",
            "done": "Done",
            "observanceNote": "Please note that certain fasting dates are subject to change based on the lunar calendar.",
            "noUpcomingObservances": "No upcoming observances",
            "upcomingEvents": "Upcoming Events",
            
            // Donation Flow
            "selectCategory": "Select Category",
            "selectAmount": "Select Amount",
            "customAmount": "Custom Amount",
            "reviewDonation": "Review Donation",
            "donorInformation": "Donor Information",
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
            "home": "Home",
            "selectAmountToContinue": "Select Amount to Continue",
            
            // Payment
            "processingPayment": "Processing Payment...",
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
            "enterAmount": "Enter Amount",
            "quantity": "Quantity",
            "total": "Total",
            "yajmanOpportunities": "Yajman Opportunities",
            "pledgeOption": "Pledge Option"
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
            "observance": "અવલોકન",
            "religiousObservances": "ધાર્મિક અવલોકનો",
            "done": "પૂર્ણ",
            "observanceNote": "કૃપા કરીને નોંધ કરો કે ચંદ્ર પંચાંગના આધારે કેટલાક ઉપવાસની તારીખો બદલાઈ શકે છે.",
            "noUpcomingObservances": "કોઈ આગામી અવલોકનો નથી",
            "upcomingEvents": "આગામી ઇવેન્ટ્સ",
            
            // Donation Flow
            "selectCategory": "કેટેગરી પસંદ કરો",
            "selectAmount": "રકમ પસંદ કરો",
            "customAmount": "કસ્ટમ રકમ",
            "reviewDonation": "દાનની સમીક્ષા કરો",
            "donorInformation": "દાતાની માહિતી",
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
            "home": "હોમ",
            "selectAmountToContinue": "ચાલુ રાખવા માટે રકમ પસંદ કરો",
            
            // Payment
            "processingPayment": "પેમેન્ટ પ્રક્રિયા કરી રહ્યા છીએ...",
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
            "enterAmount": "રકમ દાખલ કરો",
            "quantity": "પ્રમાણ",
            "total": "કુલ",
            "yajmanOpportunities": "યજમાન તકો",
            "pledgeOption": "વચન વિકલ્પ"
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
            "observance": "अवलोकन",
            "religiousObservances": "धार्मिक अवलोकन",
            "done": "पूर्ण",
            "observanceNote": "कृपया ध्यान दें कि चंद्र पंचांग के आधार पर कुछ उपवास की तारीखें बदल सकती हैं।",
            "noUpcomingObservances": "कोई आगामी अवलोकन नहीं",
            "upcomingEvents": "आगामी इवेंट्स",
            
            // Donation Flow
            "selectCategory": "श्रेणी चुनें",
            "selectAmount": "राशि चुनें",
            "customAmount": "कस्टम राशि",
            "reviewDonation": "दान की समीक्षा करें",
            "donorInformation": "दाता की जानकारी",
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
            "home": "होम",
            "selectAmountToContinue": "जारी रखने के लिए राशि चुनें",
            
            // Payment
            "processingPayment": "भुगतान प्रसंस्करण...",
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
            "enterAmount": "राशि दर्ज करें",
            "quantity": "मात्रा",
            "total": "कुल",
            "yajmanOpportunities": "यजमान अवसर",
            "pledgeOption": "प्रतिज्ञा विकल्प"
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

