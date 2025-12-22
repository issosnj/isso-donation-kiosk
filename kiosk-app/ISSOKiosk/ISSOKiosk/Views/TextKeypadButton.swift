import SwiftUI

struct TextKeypadButton: View {
    let character: String
    @Binding var enteredText: String
    var capitalize: Bool = false // For name fields
    
    var body: some View {
        Button(action: {
            // Check if character is a number
            let isNumber = character.rangeOfCharacter(from: .decimalDigits) != nil
            // Check if character is a letter
            let isLetter = character.rangeOfCharacter(from: .letters) != nil
            
            if isNumber {
                // Add numbers as-is
                enteredText += character
            } else if !isLetter {
                // Add special characters (., @, etc.) as-is
                enteredText += character
            } else if capitalize {
                // For names, capitalize first letter of each word
                if enteredText.isEmpty || enteredText.last == " " {
                    enteredText += character.uppercased()
                } else {
                    enteredText += character.lowercased()
                }
            } else {
                // For email/address, always lowercase
                enteredText += character.lowercased()
            }
        }) {
            Text(character)
                .font(.custom("Inter-SemiBold", size: 22))
                .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                .frame(maxWidth: .infinity)
                .frame(height: 60)
                .background(Color.white)
                .cornerRadius(12)
                .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
        }
    }
}

