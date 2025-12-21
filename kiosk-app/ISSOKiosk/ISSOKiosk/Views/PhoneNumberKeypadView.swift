import SwiftUI

struct PhoneNumberKeypadView: View {
    @Binding var phoneNumber: String
    let onDismiss: () -> Void
    @FocusState private var isPhoneFocused: Bool
    @State private var enteredPhone: String = ""
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background gradient
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color.white,
                        Color(red: 0.95, green: 0.97, blue: 1.0)
                    ]),
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                
                VStack(spacing: 32) {
                    // Header
                    VStack(spacing: 12) {
                        Text("Enter Phone Number")
                            .font(.custom("Inter-SemiBold", size: 32))
                            .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                        
                        Text("Enter your 10-digit phone number")
                            .font(.custom("Inter-Regular", size: 18))
                            .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 20)
                    }
                    .padding(.top, 40)
                    
                    // Phone input field
                    VStack(spacing: 16) {
                        HStack {
                            Text("(")
                                .font(.custom("Inter-SemiBold", size: 48))
                                .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                            
                            TextField("000) 000-0000", text: $enteredPhone)
                                .keyboardType(.numberPad)
                                .font(.custom("Inter-SemiBold", size: 48))
                                .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                .focused($isPhoneFocused)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .onChange(of: enteredPhone) { newValue in
                                    // Format phone number as user types
                                    let digits = newValue.filter { $0.isNumber }
                                    if digits.count <= 10 {
                                        enteredPhone = formatPhoneNumber(digits)
                                    } else {
                                        enteredPhone = formatPhoneNumber(String(digits.prefix(10)))
                                    }
                                }
                        }
                        .padding(.horizontal, 24)
                        .padding(.vertical, 20)
                        .background(Color.white)
                        .cornerRadius(16)
                        .shadow(color: Color.black.opacity(0.1), radius: 8, x: 0, y: 4)
                        .padding(.horizontal, 20)
                        
                        // Numeric keypad
                        VStack(spacing: 12) {
                            HStack(spacing: 12) {
                                PhoneKeypadButton(number: "1", letters: "", enteredPhone: $enteredPhone)
                                PhoneKeypadButton(number: "2", letters: "ABC", enteredPhone: $enteredPhone)
                                PhoneKeypadButton(number: "3", letters: "DEF", enteredPhone: $enteredPhone)
                            }
                            HStack(spacing: 12) {
                                PhoneKeypadButton(number: "4", letters: "GHI", enteredPhone: $enteredPhone)
                                PhoneKeypadButton(number: "5", letters: "JKL", enteredPhone: $enteredPhone)
                                PhoneKeypadButton(number: "6", letters: "MNO", enteredPhone: $enteredPhone)
                            }
                            HStack(spacing: 12) {
                                PhoneKeypadButton(number: "7", letters: "PQRS", enteredPhone: $enteredPhone)
                                PhoneKeypadButton(number: "8", letters: "TUV", enteredPhone: $enteredPhone)
                                PhoneKeypadButton(number: "9", letters: "WXYZ", enteredPhone: $enteredPhone)
                            }
                            HStack(spacing: 12) {
                                PhoneKeypadButton(number: "*", letters: "", enteredPhone: $enteredPhone)
                                PhoneKeypadButton(number: "0", letters: "+", enteredPhone: $enteredPhone)
                                PhoneKeypadButton(number: "#", letters: "", enteredPhone: $enteredPhone)
                            }
                            HStack(spacing: 12) {
                                // Backspace button
                                Button(action: {
                                    if !enteredPhone.isEmpty {
                                        let digits = enteredPhone.filter { $0.isNumber }
                                        if !digits.isEmpty {
                                            enteredPhone = formatPhoneNumber(String(digits.dropLast()))
                                        }
                                    }
                                }) {
                                    Image(systemName: "delete.left.fill")
                                        .font(.system(size: 24))
                                        .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                        .frame(maxWidth: .infinity)
                                        .frame(height: 60)
                                        .background(Color.white)
                                        .cornerRadius(12)
                                        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
                                }
                                .frame(maxWidth: .infinity)
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                    
                    Spacer()
                    
                    // Continue button
                    Button(action: {
                        // Extract only digits
                        let digits = enteredPhone.filter { $0.isNumber }
                        phoneNumber = digits
                        onDismiss()
                    }) {
                        Text("Continue")
                            .font(.custom("Inter-Medium", size: 20))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                LinearGradient(
                                    gradient: Gradient(colors: [
                                        Color(red: 0.2, green: 0.4, blue: 0.8),
                                        Color(red: 0.3, green: 0.5, blue: 0.9)
                                    ]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(12)
                            .shadow(color: Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.3), radius: 8, x: 0, y: 4)
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 40)
                    .disabled(enteredPhone.filter { $0.isNumber }.count < 10)
                    .opacity(enteredPhone.filter { $0.isNumber }.count < 10 ? 0.5 : 1.0)
                }
            }
            .navigationTitle("Phone Number")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        onDismiss()
                    }
                    .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                }
            }
            .onAppear {
                // Format existing phone number
                let digits = phoneNumber.filter { $0.isNumber }
                enteredPhone = formatPhoneNumber(digits)
                // Focus the text field after a short delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    isPhoneFocused = true
                }
            }
        }
    }
    
    private func formatPhoneNumber(_ digits: String) -> String {
        if digits.isEmpty {
            return ""
        }
        
        if digits.count <= 3 {
            return "(\(digits)"
        } else if digits.count <= 6 {
            let areaCode = String(digits.prefix(3))
            let firstPart = String(digits.dropFirst(3))
            return "(\(areaCode)) \(firstPart)"
        } else {
            let areaCode = String(digits.prefix(3))
            let firstPart = String(digits.dropFirst(3).prefix(3))
            let lastPart = String(digits.dropFirst(6))
            return "(\(areaCode)) \(firstPart)-\(lastPart)"
        }
    }
}

struct PhoneKeypadButton: View {
    let number: String
    let letters: String
    @Binding var enteredPhone: String
    
    var body: some View {
        Button(action: {
            if number == "*" || number == "#" {
                return // Don't add * or # to phone number
            }
            let digits = enteredPhone.filter { $0.isNumber }
            if digits.count < 10 {
                enteredPhone = formatPhoneNumber(digits + number)
            }
        }) {
            VStack(spacing: 4) {
                Text(number)
                    .font(.custom("Inter-SemiBold", size: 28))
                    .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                
                if !letters.isEmpty {
                    Text(letters)
                        .font(.custom("Inter-Regular", size: 10))
                        .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 60)
            .background(Color.white)
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
        }
        .disabled(number == "*" || number == "#")
        .opacity((number == "*" || number == "#") ? 0.3 : 1.0)
    }
    
    private func formatPhoneNumber(_ digits: String) -> String {
        if digits.isEmpty {
            return ""
        }
        
        if digits.count <= 3 {
            return "(\(digits)"
        } else if digits.count <= 6 {
            let areaCode = String(digits.prefix(3))
            let firstPart = String(digits.dropFirst(3))
            return "(\(areaCode)) \(firstPart)"
        } else {
            let areaCode = String(digits.prefix(3))
            let firstPart = String(digits.dropFirst(3).prefix(3))
            let lastPart = String(digits.dropFirst(6))
            return "(\(areaCode)) \(firstPart)-\(lastPart)"
        }
    }
}

