import SwiftUI
import UIKit

struct NameKeypadView: View {
    @Binding var name: String
    let onDismiss: () -> Void
    @State private var enteredName: String = ""
    
    var body: some View {
        ZStack {
            // Semi-transparent background overlay
            Color.black.opacity(0.4)
                .ignoresSafeArea()
                .onTapGesture {
                    onDismiss()
                }
            
            // Single smooth popup - wider and more appealing
            ScrollView {
                VStack(spacing: 0) {
                    // Header with Cancel button
                    HStack {
                        Button(action: {
                            onDismiss()
                        }) {
                            Text("Cancel")
                                .font(.custom("Inter-Medium", size: 16))
                                .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                        }
                        
                        Spacer()
                        
                        Text("Name")
                            .font(.custom("Inter-SemiBold", size: 24))
                            .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                        
                        Spacer()
                        
                        // Invisible spacer to balance Cancel button
                        Text("Cancel")
                            .font(.custom("Inter-Medium", size: 16))
                            .foregroundColor(.clear)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 12)
                    .padding(.bottom, 16)
                
                // Name input display
                Text(enteredName.isEmpty ? "Enter your name" : enteredName)
                    .font(.custom("Inter-SemiBold", size: 32))
                    .foregroundColor(enteredName.isEmpty ? Color(red: 0.7, green: 0.7, blue: 0.7) : Color(red: 0.26, green: 0.20, blue: 0.20))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 18)
                    .background(Color(red: 0.98, green: 0.98, blue: 0.98))
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
                    .padding(.horizontal, 32)
                    .padding(.bottom, 16)
                
                // Text keypad
                VStack(spacing: 12) {
                    HStack(spacing: 12) {
                        TextKeypadButton(character: "Q", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "W", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "E", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "R", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "T", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "Y", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "U", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "I", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "O", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "P", enteredText: $enteredName, capitalize: true)
                    }
                    HStack(spacing: 12) {
                        TextKeypadButton(character: "A", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "S", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "D", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "F", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "G", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "H", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "J", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "K", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "L", enteredText: $enteredName, capitalize: true)
                    }
                    HStack(spacing: 12) {
                        TextKeypadButton(character: "Z", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "X", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "C", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "V", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "B", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "N", enteredText: $enteredName, capitalize: true)
                        TextKeypadButton(character: "M", enteredText: $enteredName, capitalize: true)
                    }
                    HStack(spacing: 12) {
                        // Space button
                        Button(action: {
                            enteredName += " "
                        }) {
                                        Text("Space")
                                            .font(.custom("Inter-Medium", size: 16))
                                            .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                            .frame(maxWidth: .infinity)
                                            .frame(height: 60)
                                            .background(Color(red: 0.98, green: 0.97, blue: 0.95))
                                            .cornerRadius(12)
                                            .shadow(color: Color.black.opacity(0.08), radius: 3, x: 0, y: 2)
                        }
                        .frame(maxWidth: .infinity)
                        
                        // Backspace button
                        Button(action: {
                            if !enteredName.isEmpty {
                                enteredName.removeLast()
                            }
                        }) {
                                        Image(systemName: "delete.left.fill")
                                            .font(.system(size: 20, weight: .semibold))
                                            .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                                            .frame(maxWidth: .infinity)
                                            .frame(height: 60)
                                            .background(Color(red: 0.98, green: 0.97, blue: 0.95))
                                            .cornerRadius(12)
                                            .shadow(color: Color.black.opacity(0.08), radius: 3, x: 0, y: 2)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 16)
                
                // Continue button - matching Proceed to Payment style
                Button(action: {
                    name = enteredName
                    onDismiss()
                }) {
                    HStack(spacing: 12) {
                        Text("Continue")
                            .font(.custom("Inter-Medium", size: 20))
                            .foregroundColor(enteredName.trimmingCharacters(in: .whitespaces).isEmpty ? Color.gray : Color.white)
                        Image(systemName: "arrow.right")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(enteredName.trimmingCharacters(in: .whitespaces).isEmpty ? Color.gray : Color.white)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .background(
                        enteredName.trimmingCharacters(in: .whitespaces).isEmpty
                            ? LinearGradient(
                                gradient: Gradient(colors: [Color.gray.opacity(0.5), Color.gray.opacity(0.3)]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                            : LinearGradient(
                                gradient: Gradient(colors: [
                                    Color(red: 0.85, green: 0.75, blue: 0.5),
                                    Color(red: 0.95, green: 0.85, blue: 0.6)
                                ]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                    )
                    .cornerRadius(12)
                    .shadow(color: enteredName.trimmingCharacters(in: .whitespaces).isEmpty ? Color.clear : Color.black.opacity(0.2), radius: 8, x: 0, y: 4)
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 16)
                .disabled(enteredName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .frame(maxWidth: 900) // Wider popup
                .padding(.vertical, 16)
            }
            .frame(maxWidth: 900)
            .background(Color.white)
            .cornerRadius(24)
            .shadow(color: Color.black.opacity(0.25), radius: 30, x: 0, y: 15)
        }
        .onAppear {
            enteredName = name
            // Hide system keyboard when view appears
            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
        }
    }
}
