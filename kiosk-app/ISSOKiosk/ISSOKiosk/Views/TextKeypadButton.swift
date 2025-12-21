import SwiftUI

struct TextKeypadButton: View {
    let character: String
    @Binding var enteredText: String
    var capitalize: Bool = false // For name fields
    
    var body: some View {
        Button(action: {
            if capitalize {
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
                .font(.custom("Inter-SemiBold", size: 20))
                .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                .frame(width: 50, height: 50)
                .background(Color.white)
                .cornerRadius(12)
                .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
        }
    }
}

