import SwiftUI
import UIKit

/// Pick a category and amount to append as an additional seva line on the review screen.
struct AdditionalSevaPickerView: View {
    @EnvironmentObject var appState: AppState
    let onAdd: (CheckoutDonationLine) -> Void
    let onCancel: () -> Void
    
    @State private var pickedCategory: DonationCategory?
    @State private var customAmount: String = ""
    
    private var presetAmounts: [Double] {
        appState.temple?.homeScreenConfig?.presetAmounts ?? [5, 10, 25, 50, 100]
    }
    
    private var headingColor: Color {
        Color(red: 0.22, green: 0.18, blue: 0.16)
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("additionalSevaInstructions".localized)
                        .font(.custom("Georgia", size: 16))
                        .foregroundColor(headingColor.opacity(0.85))
                        .padding(.horizontal)
                    
                    Text("selectCategory".localized)
                        .font(.custom("Georgia", size: 18))
                        .foregroundColor(headingColor)
                        .padding(.horizontal)
                    
                    LazyVStack(spacing: 12) {
                        ForEach(appState.categories) { cat in
                            Button {
                                pickedCategory = cat
                                customAmount = ""
                            } label: {
                                HStack {
                                    Text(cat.name)
                                        .font(.custom("Inter-Medium", size: 17))
                                        .foregroundColor(headingColor)
                                        .multilineTextAlignment(.leading)
                                    Spacer()
                                    if pickedCategory?.id == cat.id {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(Color(red: 147 / 255, green: 22 / 255, blue: 19 / 255))
                                    }
                                }
                                .padding()
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(Color(red: 242 / 255, green: 235 / 255, blue: 224 / 255).opacity(pickedCategory?.id == cat.id ? 1 : 0.6))
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal)
                    
                    if pickedCategory != nil {
                        Text("selectAmount".localized)
                            .font(.custom("Georgia", size: 18))
                            .foregroundColor(headingColor)
                            .padding(.horizontal)
                        
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            if let cat = pickedCategory, let def = cat.defaultAmount, def > 0 {
                                amountChip(label: def.formattedCurrencyWhole(), amount: def)
                            }
                            ForEach(presetAmounts, id: \.self) { amt in
                                amountChip(label: amt.formattedCurrencyWhole(), amount: amt)
                            }
                        }
                        .padding(.horizontal)
                        
                        Text("customAmount".localized)
                            .font(.custom("Georgia", size: 16))
                            .foregroundColor(headingColor)
                            .padding(.horizontal)
                        
                        TextField("enterAmount".localized, text: $customAmount)
                            .keyboardType(.decimalPad)
                            .font(.custom("Georgia", size: 20))
                            .padding()
                            .background(RoundedRectangle(cornerRadius: 12).fill(Color.white.opacity(0.9)))
                            .padding(.horizontal)
                        
                        Button {
                            addCustomLine()
                        } label: {
                            Text("addToDonation".localized)
                                .font(.custom("Georgia", size: 17))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(
                                    RoundedRectangle(cornerRadius: 14)
                                        .fill(Color(red: 147 / 255, green: 22 / 255, blue: 19 / 255))
                                )
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal)
                        .padding(.top, 8)
                    }
                }
                .padding(.vertical, 20)
            }
            .background(
                Group {
                    if UIImage(named: "KioskBackground") != nil {
                        Image("KioskBackground")
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .ignoresSafeArea()
                    } else {
                        Color(red: 0.97, green: 0.97, blue: 0.98).ignoresSafeArea()
                    }
                }
            )
            .navigationTitle("additionalSevaTitle".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("cancel".localized) {
                        onCancel()
                    }
                }
            }
        }
    }
    
    @ViewBuilder
    private func amountChip(label: String, amount: Double) -> some View {
        Button {
            guard let cat = pickedCategory else { return }
            onAdd(CheckoutDonationLine(id: UUID(), label: cat.name, amount: amount, categoryId: cat.id))
        } label: {
            Text(label)
                .font(.custom("Inter-Medium", size: 18))
                .foregroundColor(headingColor)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(red: 242 / 255, green: 235 / 255, blue: 224 / 255))
                )
        }
        .buttonStyle(.plain)
    }
    
    private func addCustomLine() {
        guard let cat = pickedCategory else { return }
        let trimmed = customAmount.trimmingCharacters(in: .whitespaces)
        guard let value = Double(trimmed), value > 0 else { return }
        onAdd(CheckoutDonationLine(id: UUID(), label: cat.name, amount: value, categoryId: cat.id))
    }
}
