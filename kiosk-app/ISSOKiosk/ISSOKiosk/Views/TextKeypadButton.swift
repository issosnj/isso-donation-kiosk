import SwiftUI

/// Text key for QWERTY keyboards. Uses KeyboardKeyButton for consistent styling + press animation.
struct TextKeypadButton: View {
    let character: String
    @Binding var enteredText: String
    var capitalize: Bool = false

    var body: some View {
        KeyboardKeyButton(primaryLabel: character, action: {
            let isNumber = character.rangeOfCharacter(from: .decimalDigits) != nil
            let isLetter = character.rangeOfCharacter(from: .letters) != nil
            if isNumber {
                enteredText += character
            } else if !isLetter {
                enteredText += character
            } else if capitalize {
                if enteredText.isEmpty || enteredText.last == " " {
                    enteredText += character.uppercased()
                } else {
                    enteredText += character.lowercased()
                }
            } else {
                enteredText += character.lowercased()
            }
        })
    }
}

